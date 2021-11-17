import BigNumber from 'bignumber.js'

import {
  getEthersProvider,
  ethers,
  BlockEvent,
  Finding,
  HandleBlock,
  HandleTransaction,
  TransactionEvent,
  FindingSeverity,
  FindingType,
} from 'forta-agent'

import {Event} from 'ethers'
import {Block} from '@ethersproject/abstract-provider'

import LIDO_ORACLE_ABI from './abi/LidoOracle.json'
import ANCHOR_VAULT_ABI from './abi/AnchorVault.json'

import {
  LIDO_ORACLE_ADDRESS,
  LIDO_ORACLE_COMPLETED_EVENT,
  ANCHOR_VAULT_ADDRESS,
  ANCHOR_VAULT_REWARDS_COLLECTED_EVENT,
  MAX_REWARDS_SELL_DELAY,
  TRIGGER_PERIOD,
} from './constants'


const ethersProvider = getEthersProvider()

// re-fetched from history on startup
let lastOracleReportAt = 0
let lastRewardsSellAt = 0

let initialized = false
let lastTriggeredAt = 0


const initialize = async (currentBlock: number) => {
  const lidoOracle = new ethers.Contract(LIDO_ORACLE_ADDRESS, LIDO_ORACLE_ABI, ethersProvider)
  const anchorVault = new ethers.Contract(ANCHOR_VAULT_ADDRESS, ANCHOR_VAULT_ABI, ethersProvider)

  const oracleReportFilter = lidoOracle.filters.Completed()
  const rewardsSoldFilter = anchorVault.filters.RewardsCollected()

  // ~2 days ago
  const pastBlock = currentBlock - Math.ceil(50 * 60 * 60 / 13)

  const [reportEvents, sellEvents] = await Promise.all([
    lidoOracle.queryFilter(oracleReportFilter, pastBlock, currentBlock),
    anchorVault.queryFilter(rewardsSoldFilter, pastBlock, currentBlock),
  ])

  const getLastEventBlockTimestamp = async (events: Event[]): Promise<number> => {
    if (events.length == 0) {
      return 0
    }

    const byBlockNumberDesc = (e1: Event, e2: Event) => e2.blockNumber - e1.blockNumber
    events.sort(byBlockNumberDesc)

    const lastBlock = await events[0].getBlock()
    return lastBlock.timestamp
  }

  const [reportTime, sellTime] = await Promise.all([
    getLastEventBlockTimestamp(reportEvents),
    getLastEventBlockTimestamp(sellEvents),
  ])

  lastOracleReportAt = reportTime
  lastRewardsSellAt = sellTime

  console.log('lastOracleReportAt:', lastOracleReportAt)
  console.log('lastRewardsSellAt:', lastRewardsSellAt)
}


const handleBlock: HandleBlock = async (blockEvent: BlockEvent) => {
  if (!initialized) {
    await initialize(blockEvent.blockNumber)
    initialized = true
  }

  const findings: Finding[] = []

  if (lastRewardsSellAt > lastOracleReportAt) {
    // rewards already sold
    return findings
  }

  const now = blockEvent.block.timestamp
  const sellDelay = now - lastOracleReportAt

  console.log(`sellDelay: ${sellDelay}`)

  if (sellDelay <= MAX_REWARDS_SELL_DELAY || now - lastTriggeredAt < TRIGGER_PERIOD) {
    return findings
  }

  findings.push(Finding.fromObject({
    name: 'Anchor rewards sell overdue',
    description: `Time since oracle report: ${formatDelay(sellDelay)}`,
    alertId: 'ANCHOR_REWARDS_OVERDUE',
    severity: FindingSeverity.High,
    type: FindingType.Degraded,
    metadata: {
      delay: `${sellDelay}`,
    },
  }))

  lastTriggeredAt = now

  return findings
}


const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  const findings: Finding[] = []

  if (txEvent.to == LIDO_ORACLE_ADDRESS) {
    handleOracleTx(txEvent, findings)
  }

  if (txEvent.to == ANCHOR_VAULT_ADDRESS) {
    handleAnchorVaultTx(txEvent, findings)
  }

  return findings
}


function handleOracleTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [completedEvent] = txEvent.filterLog(LIDO_ORACLE_COMPLETED_EVENT, LIDO_ORACLE_ADDRESS)
  if (completedEvent == undefined) {
    return
  }

  lastOracleReportAt = txEvent.block.timestamp

  const {beaconBalance, beaconValidators} = completedEvent.args
  const beaconBalanceEth = formatEth(beaconBalance, 3)

  findings.push(Finding.fromObject({
    name: 'Lido Oracle report',
    description: `Total balance: ${beaconBalanceEth} ETH, total validators: ${beaconValidators}`,
    alertId: 'LIDO_ORACLE_REPORT',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata: {
      beaconBalance: `${beaconBalance}`,
      beaconValidators: `${beaconValidators}`,
    },
  }))
}


function handleAnchorVaultTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [rewardsCollectedEvent] = txEvent.filterLog(ANCHOR_VAULT_REWARDS_COLLECTED_EVENT, ANCHOR_VAULT_ADDRESS)
  if (rewardsCollectedEvent == undefined) {
    return
  }

  lastRewardsSellAt = txEvent.block.timestamp

  const stethAmount = formatEth(rewardsCollectedEvent.args.steth_amount, 3)
  const ustAmount = formatEth(rewardsCollectedEvent.args.ust_amount, 1)

  findings.push(Finding.fromObject({
    name: 'Anchor rewards collected',
    description: `Sold ${stethAmount} stETH to ${ustAmount} UST`,
    alertId: 'ANCHOR_REWARDS_COLLECTED',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata: {
      stethAmount: `${rewardsCollectedEvent.args.steth_amount}`,
      ustAmount: `${rewardsCollectedEvent.args.ust_amount}`,
    },
  }))
}


const TEN_TO_18 = new BigNumber(10).pow(18)

function formatEth(amount: any, dp: number): string {
  return new BigNumber(String(amount)).div(TEN_TO_18).toFixed(dp)
}


function formatDelay(delaySec: number) {
  const delayMin = Math.floor(delaySec / 60)
  return `${delayMin} min ${delaySec - delayMin * 60} sec`
}


export default {
  handleBlock,
  handleTransaction,
}
