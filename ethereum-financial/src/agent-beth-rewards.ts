import BigNumber from 'bignumber.js'

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from 'forta-agent'


import {formatEth, formatDelay} from './utils'
import {ethersProvider} from './ethers'

import ANCHOR_VAULT_ABI from './abi/AnchorVault.json'
import LIDO_ORACLE_ABI from "./abi/LidoOracle.json";

import {
  ANCHOR_VAULT_ADDRESS,
  ANCHOR_VAULT_REWARDS_COLLECTED_EVENT,
  ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT,
  MAX_BETH_REWARDS_SELL_DELAY,
  TRIGGER_PERIOD,
  MIN_REWARDS_LIQUIDATOR_ADMIN_BALANCE,
  ETH_DECIMALS,
  BALANCE_REPORT_WINDOW,
  ANCHOR_DEPOSIT_EVENT,
  ANCHOR_WITHDRAW_EVENT,
  MAX_ANCHOR_DEPOSIT_WITHDRAW_AMOUNT,
  LIDO_ORACLE_COMPLETED_EVENT,
  LIDO_ORACLE_ADDRESS,
} from './constants'

import { byBlockNumberDesc } from './utils/tools'



let rewardsLiquidatorAddress: string
let rewardsLiquidatorAdminAddress: string

let lastRewardsSell = {
  timestamp: 0,
  stethAmount: new BigNumber(0),
  ustAmount: new BigNumber(0),
}

let lastOverdueTriggeredAt = 0
let lastLowBalanceTriggeredAt = 0
let lastOracleReportTime = 0

const ONE_HOUR = 60 * 60;


export const name = 'AgentBethRewards'


export async function initialize(currentBlock: number): Promise<{[key: string]: string}> {

  // ~2 hours ago
  const pastBlockOracleReport = currentBlock - Math.ceil(2 * 60 * 60 / 13)
  lastOracleReportTime = await getLastOracleReportTime(pastBlockOracleReport, currentBlock - 1)

  const anchorVault = new ethers.Contract(ANCHOR_VAULT_ADDRESS, ANCHOR_VAULT_ABI, ethersProvider)
  const rewardsSoldFilter = anchorVault.filters.RewardsCollected()

  // ~2 days ago
  const pastBlock = currentBlock - Math.ceil(50 * 60 * 60 / 13)
  const sellEvents = await anchorVault.queryFilter(rewardsSoldFilter, pastBlock, currentBlock - 1)

  if (sellEvents.length > 0) {
    sellEvents.sort(byBlockNumberDesc)
    const lastSellEvent = sellEvents[0]

    const lastBlock = await lastSellEvent.getBlock()
    const {steth_amount, ust_amount} = (lastSellEvent.args || {steth_amount: '0', ust_amount: '0'})

    lastRewardsSell = {
      timestamp: lastBlock.timestamp,
      stethAmount: new BigNumber(String(steth_amount)),
      ustAmount: new BigNumber(String(ust_amount)),
    }
  }

  rewardsLiquidatorAddress = await anchorVault.rewards_liquidator()
  rewardsLiquidatorAdminAddress = await anchorVault.liquidations_admin()

  console.log(`[AgentBethRewards] lastRewardsSell: {
    timestamp: ${lastRewardsSell.timestamp},
    stethAmount: ${formatEth(lastRewardsSell.stethAmount, 5)},
    ustAmount: ${formatEth(lastRewardsSell.ustAmount, 3)}\n}`)

  console.log(`[AgentBethRewards] rewardsLiquidatorAddress: ${rewardsLiquidatorAddress}`)
  console.log(`[AgentBethRewards] rewardsLiquidatorAdminAddress: ${rewardsLiquidatorAdminAddress}`)

  return {
    rewardsLiquidatorAddress: `${rewardsLiquidatorAddress}`,
    rewardsLiquidatorAdminAddress: `${rewardsLiquidatorAdminAddress}`,
    lastRewardsSellTimestamp: `${lastRewardsSell.timestamp}`,
  }
}


export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = []

  await Promise.all([
    handleSellOverdue(blockEvent, findings),
    handleAdminBalance(blockEvent, findings),
  ])

  return findings
}


async function handleSellOverdue(blockEvent: BlockEvent, findings: Finding[]) {

  if (lastRewardsSell.timestamp > lastOracleReportTime) {
    // rewards already sold
    return
  }

  const now = blockEvent.block.timestamp
  const sellDelay = now - lastOracleReportTime

  console.log(`[AgentBethRewards] sellDelay: ${sellDelay}`)

  if (sellDelay <= MAX_BETH_REWARDS_SELL_DELAY || now - lastOverdueTriggeredAt < TRIGGER_PERIOD) {
    return
  }

    // final check to handle case of missed event

    const anchorVault = new ethers.Contract(ANCHOR_VAULT_ADDRESS, ANCHOR_VAULT_ABI, ethersProvider)
    const lastLiquidationTime = parseInt(String(await anchorVault.functions.last_liquidation_time()))
  
    if (lastLiquidationTime > lastRewardsSell.timestamp) {
      lastRewardsSell.timestamp = lastLiquidationTime
      lastRewardsSell.stethAmount = new BigNumber(0)
      lastRewardsSell.ustAmount = new BigNumber(0)
      return findings
    }
  

  findings.push(Finding.fromObject({
    name: 'Anchor rewards sell overdue',
    description: `Time since oracle report: ${formatDelay(sellDelay)}`,
    alertId: 'BETH-REWARDS-OVERDUE',
    severity: FindingSeverity.High,
    type: FindingType.Degraded,
    metadata: {
      delay: `${sellDelay}`,
    },
  }))

  lastOverdueTriggeredAt = now
}

async function handleAdminBalance(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp
  if (lastLowBalanceTriggeredAt + BALANCE_REPORT_WINDOW < now) {
    const accountBalance = new BigNumber(String(await ethersProvider.getBalance(rewardsLiquidatorAdminAddress, blockEvent.blockNumber)))
    if (accountBalance.isLessThanOrEqualTo(MIN_REWARDS_LIQUIDATOR_ADMIN_BALANCE)) {
      findings.push(Finding.fromObject({
        name: 'Low anchor rewards liquidator admin balance',
        description: `Anchor rewards liquidator admin balance is ${accountBalance.div(ETH_DECIMALS).toFixed(4)}`,
        alertId: 'ANCHOR-REWARDS-ADMIN-LOW-BALANCE',
        severity: FindingSeverity.High,
        type: FindingType.Degraded,
      }))
      lastLowBalanceTriggeredAt = now
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = []

  if (txEvent.to === ANCHOR_VAULT_ADDRESS) {
    handleAnchorVaultTx(txEvent, findings)
    handleAnchorVaultWithdrawOrDepositTx(txEvent, findings)
  }

  handleOracleTx(txEvent, findings)

  return findings
}


const TEN_TO_18 = new BigNumber(10).pow(18)
const TEN_TO_12 = new BigNumber(10).pow(12)
const TEN_TO_36 = TEN_TO_18.times(TEN_TO_18)


function handleAnchorVaultTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [rewardsCollectedEvent] = txEvent.filterLog(ANCHOR_VAULT_REWARDS_COLLECTED_EVENT, ANCHOR_VAULT_ADDRESS)
  if (rewardsCollectedEvent == undefined) {
    return
  }

  const [soldEvent] = txEvent.filterLog(ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT, rewardsLiquidatorAddress)
  const {steth_eth_price, eth_usdc_price, usdc_ust_price} = soldEvent.args

  const stethAmount = new BigNumber(String(rewardsCollectedEvent.args.steth_amount))
  const ustAmount = new BigNumber(String(rewardsCollectedEvent.args.ust_amount)).times(TEN_TO_12)

  const stethUstPrice = new BigNumber(String(steth_eth_price))
    .times(String(eth_usdc_price))
    .times(String(usdc_ust_price))
    .div(TEN_TO_36)

  const ustAmountNoSlippage = stethAmount.times(stethUstPrice).div(TEN_TO_18)

  const slippagePercent = ustAmount.isGreaterThan(ustAmountNoSlippage)
    ? new BigNumber(0)
    : ustAmount.div(ustAmountNoSlippage).minus(1).times(-100)

  lastRewardsSell = {
    timestamp: txEvent.block.timestamp,
    stethAmount,
    ustAmount,
  }

  const stethDispAmount = formatEth(stethAmount, 3)
  const ustDispAmount = formatEth(ustAmount, 1)
  const stethUstDispPrice = formatEth(stethUstPrice, 1)
  const slippageDispPercent = slippagePercent.toFixed(2)

  const now = txEvent.block.timestamp;
  // increase sell alert severity if there were recent overdue alerts
  const severity = now - lastOverdueTriggeredAt < ONE_HOUR ? FindingSeverity.Medium : FindingSeverity.Info;

  findings.push(Finding.fromObject({
    name: 'Anchor rewards collected',
    description: `Sold ${stethDispAmount} stETH to ${ustDispAmount} UST, ` +
      `feed price ${stethUstDispPrice} UST per stETH, slippage ${slippageDispPercent}%`,
    alertId: 'BETH-REWARDS-COLLECTED',
    severity: severity,
    type: FindingType.Info,
    metadata: {
      stethAmount: `${stethAmount}`,
      ustAmount: `${rewardsCollectedEvent.args.ust_amount}`,
      slippagePercent: `${slippagePercent.toString(10)}`,
      stethUstFeedPrice: `${stethUstPrice.toFixed(0, 3)}`,
    },
  }))
}


function handleAnchorVaultWithdrawOrDepositTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [withdrawEvent] = txEvent.filterLog(ANCHOR_WITHDRAW_EVENT, ANCHOR_VAULT_ADDRESS)
  const [depositEvent] = txEvent.filterLog(ANCHOR_DEPOSIT_EVENT, ANCHOR_VAULT_ADDRESS)
  if (withdrawEvent != undefined) {
    const withdrawAmount = new BigNumber(String(withdrawEvent.args.amount))
    if (withdrawAmount.isGreaterThanOrEqualTo(MAX_ANCHOR_DEPOSIT_WITHDRAW_AMOUNT)) {
      findings.push(Finding.fromObject({
        name: 'Huge Anchor withdraw',
        description: `${withdrawAmount.div(ETH_DECIMALS).toFixed(4)} stETH were withdrawn from Anchor`,
        alertId: 'ANCHOR-VAULT-HUGE-TX',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      }))
    }
  }

  if (depositEvent != undefined) {
    const depositAmount = new BigNumber(String(depositEvent.args.amount))
    if (depositAmount.isGreaterThanOrEqualTo(MAX_ANCHOR_DEPOSIT_WITHDRAW_AMOUNT)) {
      findings.push(Finding.fromObject({
        name: 'Huge Anchor deposit',
        description: `${depositAmount.div(ETH_DECIMALS).toFixed(4)} stETH were deposited to Anchor`,
        alertId: 'ANCHOR-VAULT-HUGE-TX',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      }))
    }
  }

}

function handleOracleTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [reportEvent] = txEvent.filterLog(
    LIDO_ORACLE_COMPLETED_EVENT,
    LIDO_ORACLE_ADDRESS
  );
  if (reportEvent !== undefined) {
    lastOracleReportTime = txEvent.timestamp;
  }
}

async function getLastOracleReportTime(blockFrom: number, blockTo: number) {
  const lidoOracle = new ethers.Contract(
    LIDO_ORACLE_ADDRESS,
    LIDO_ORACLE_ABI,
    ethersProvider
  );

  const oracleReportFilter = lidoOracle.filters.Completed();

  const reportEvents = await lidoOracle.queryFilter(
    oracleReportFilter,
    blockFrom,
    blockTo
  );

  reportEvents.sort(byBlockNumberDesc);

  const reportBlocks = await Promise.all(reportEvents.map((e) => e.getBlock()));

  if (reportEvents.length > 0) {
    return reportBlocks[0].timestamp;
  } else {
    return 0
  }
}