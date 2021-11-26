import BigNumber from 'bignumber.js'

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from 'forta-agent'

import {Event} from 'ethers'

import {formatEth, formatDelay} from './utils'
import {ethersProvider} from './ethers'

import ANCHOR_VAULT_ABI from './abi/AnchorVault.json'

import {
  ANCHOR_VAULT_ADDRESS,
  ANCHOR_VAULT_REWARDS_COLLECTED_EVENT,
  ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT,
  MAX_BETH_REWARDS_SELL_DELAY,
  TRIGGER_PERIOD,
} from './constants'

import {OracleReport} from './agent-lido-oracle'
import * as agentLidoOracle from './agent-lido-oracle'


let rewardsLiquidatorAddress: string

let lastRewardsSell = {
  timestamp: 0,
  stethAmount: new BigNumber(0),
  ustAmount: new BigNumber(0),
}

let lastTriggeredAt = 0


export async function initialize(currentBlock: number) {
  const anchorVault = new ethers.Contract(ANCHOR_VAULT_ADDRESS, ANCHOR_VAULT_ABI, ethersProvider)
  const rewardsSoldFilter = anchorVault.filters.RewardsCollected()

  // ~2 days ago
  const pastBlock = currentBlock - Math.ceil(50 * 60 * 60 / 13)
  const sellEvents = await anchorVault.queryFilter(rewardsSoldFilter, pastBlock, currentBlock - 1)

  if (sellEvents.length > 0) {
    const byBlockNumberDesc = (e1: Event, e2: Event) => e2.blockNumber - e1.blockNumber

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

  console.log('[AgentBethRewards] lastRewardsSell:', lastRewardsSell)
  console.log('[AgentBethRewards] rewardsLiquidatorAddress:', rewardsLiquidatorAddress)
}


export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = []

  await agentLidoOracle.waitBlockHandled(blockEvent.blockHash)
  const lastOracleReport = await agentLidoOracle.getLastOracleReport()

  if (lastRewardsSell.timestamp > lastOracleReport.timestamp) {
    // rewards already sold
    return findings
  }

  const now = blockEvent.block.timestamp
  const sellDelay = now - lastOracleReport.timestamp

  console.log(`[AgentBethRewards] sellDelay: ${sellDelay}`)

  if (sellDelay <= MAX_BETH_REWARDS_SELL_DELAY || now - lastTriggeredAt < TRIGGER_PERIOD) {
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

  lastTriggeredAt = now

  return findings
}


export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = []

  if (txEvent.to === ANCHOR_VAULT_ADDRESS) {
    handleAnchorVaultTx(txEvent, findings)
  }

  return findings
}


const TEN_TO_18 = new BigNumber(10).pow(18)
const TEN_TO_36 = TEN_TO_18.times(TEN_TO_18)


function handleAnchorVaultTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [rewardsCollectedEvent] = txEvent.filterLog(ANCHOR_VAULT_REWARDS_COLLECTED_EVENT, ANCHOR_VAULT_ADDRESS)
  if (rewardsCollectedEvent == undefined) {
    return
  }

  const {steth_amount, ust_amount} = rewardsCollectedEvent.args

  const [soldEvent] = txEvent.filterLog(ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT, rewardsLiquidatorAddress)
  const {steth_eth_price, eth_usdc_price, usdc_ust_price} = soldEvent.args

  const stethAmount = new BigNumber(String(steth_amount))
  const ustAmount = new BigNumber(String(ust_amount))

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

  const stethDispAmount = formatEth(rewardsCollectedEvent.args.steth_amount, 3)
  const ustDispAmount = formatEth(rewardsCollectedEvent.args.ust_amount, 1)
  const stethUstDispPrice = formatEth(stethUstPrice, 1)
  const slippageDispPercent = slippagePercent.toFixed(2)

  findings.push(Finding.fromObject({
    name: 'Anchor rewards collected',
    description: `Sold ${stethDispAmount} stETH to ${ustDispAmount} UST, ` +
      `feed price ${stethUstDispPrice} UST per ETH, slippage ${slippageDispPercent}%`,
    alertId: 'BETH-REWARDS-COLLECTED',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata: {
      stethAmount: `${rewardsCollectedEvent.args.steth_amount}`,
      ustAmount: `${rewardsCollectedEvent.args.ust_amount}`,
      slippagePercent: `${slippagePercent.toString(10)}`,
      stethUstFeedPrice: `${stethUstPrice.toFixed(0, 3)}`,
    },
  }))
}
