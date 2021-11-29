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
import {Result} from '@ethersproject/abi'

import {formatEth, formatDelay} from './utils'
import {makeFuture} from './utils/future'
import {ethersProvider} from './ethers'

import LIDO_ORACLE_ABI from './abi/LidoOracle.json'

import {
  LIDO_ORACLE_ADDRESS,
  LIDO_ORACLE_COMPLETED_EVENT,
  MAX_ORACLE_REPORT_DELAY,
  TRIGGER_PERIOD,
} from './constants'


export interface OracleReport {
  timestamp: number
  beaconBalance: BigNumber
  beaconValidators: number
  rewards: BigNumber
}

const ZERO = new BigNumber(0)

// re-fetched from history on startup
let lastReport: OracleReport | null = null
let lastTriggeredAt = 0

const fBlockHandled = makeFuture<void>()
const fTxHandled = makeFuture<void>()

let lastBlockHash: string
let lastTxHash: string


export async function initialize(currentBlock: number) {
  const lidoOracle = new ethers.Contract(LIDO_ORACLE_ADDRESS, LIDO_ORACLE_ABI, ethersProvider)
  const oracleReportFilter = lidoOracle.filters.Completed()

  // ~2 days 3 hours ago
  const pastBlock = currentBlock - Math.ceil(51 * 60 * 60 / 13)
  const reportEvents = await lidoOracle.queryFilter(oracleReportFilter, pastBlock, currentBlock - 1)

  const byBlockNumberDesc = (e1: Event, e2: Event) => e2.blockNumber - e1.blockNumber
  reportEvents.sort(byBlockNumberDesc)

  const reportBlocks = await Promise.all(reportEvents.map(e => e.getBlock()))

  const prevReport: OracleReport | null = reportEvents.length > 1
    ? processReportEvent(reportEvents[1].args, reportBlocks[1].timestamp, null)
    : null

  if (reportEvents.length > 0) {
    lastReport = processReportEvent(reportEvents[0].args, reportBlocks[0].timestamp, prevReport)
  }

  console.log(`[AgentLidoOracle] prevReport: ${printReport(prevReport)}`)
  console.log(`[AgentLidoOracle] lastReport: ${printReport(lastReport)}`)
}


function processReportEvent(
  eventArgs: Result | undefined,
  timestamp: number,
  prevReport: OracleReport | null,
) {
  if (eventArgs == undefined) {
    return null
  }

  const beaconBalance = new BigNumber(String(eventArgs.beaconBalance))
  const beaconValidators = +eventArgs.beaconValidators

  const report = {
    timestamp,
    beaconBalance: new BigNumber(String(beaconBalance)),
    beaconValidators: +beaconValidators,
    rewards: ZERO,
  }

  if (prevReport != null) {
    const validatorsDiff = beaconValidators - prevReport.beaconValidators
    const rewardBase = prevReport.beaconBalance.plus(ETH_PER_VALIDATOR.times(validatorsDiff))
    report.rewards = beaconBalance.minus(rewardBase)
  }

  return report
}


function printReport(report: OracleReport | null) {
  return report == null ? '<missing>' : `{
    timestamp: ${report.timestamp},
    beaconBalance: ${formatEth(report.beaconBalance, 5)},
    beaconValidators: ${report.beaconValidators},
    rewards: ${formatEth(report.rewards, 5)}\n}`
}


export async function handleBlock(blockEvent: BlockEvent) {
  lastBlockHash = blockEvent.blockHash
  fBlockHandled.reset()

  const findings: Finding[] = []
  const now = blockEvent.block.timestamp
  const reportDelay = now - (lastReport ? lastReport.timestamp : 0)

  if (reportDelay > 24 * 60 * 60) {
    console.log(`[AgentLidoOracle] reportDelay: ${reportDelay}`)
  }

  if (reportDelay > MAX_ORACLE_REPORT_DELAY && now - lastTriggeredAt >= TRIGGER_PERIOD) {
    findings.push(Finding.fromObject({
      name: 'Lido Oracle report overdue',
      description: `Time since last report: ${formatDelay(reportDelay)}`,
      alertId: 'LIDO-ORACLE-OVERDUE',
      severity: FindingSeverity.High,
      type: FindingType.Degraded,
      metadata: {
        delay: `${reportDelay}`,
      },
    }))
    lastTriggeredAt = now
  }

  fBlockHandled.resolve()

  return findings
}


export async function handleTransaction(txEvent: TransactionEvent) {
  lastTxHash = txEvent.hash
  fTxHandled.reset()

  const findings: Finding[] = []

  if (txEvent.to === LIDO_ORACLE_ADDRESS) {
    handleOracleTx(txEvent, findings)
  }

  fTxHandled.resolve()

  return findings
}


const ETH_PER_VALIDATOR = new BigNumber(10).pow(18).times(32)


function handleOracleTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [reportEvent] = txEvent.filterLog(LIDO_ORACLE_COMPLETED_EVENT, LIDO_ORACLE_ADDRESS)
  if (reportEvent == undefined) {
    return
  }

  const newReport = processReportEvent(reportEvent.args, txEvent.block.timestamp, lastReport)
  if (newReport == null) {
    return
  }

  const beaconBalanceEth = formatEth(newReport.beaconBalance, 3)
  const rewardsEth = formatEth(newReport.rewards, 3)

  let rewardsDiff: BigNumber | null = null
  let reportDelay: number | null = null
  let rewardsDiffDesc = 'unknown'
  let reportDelayDesc = 'unknown'

  if (lastReport != null) {
    rewardsDiff = newReport.rewards.minus(lastReport.rewards)
    rewardsDiffDesc = `${rewardsDiff.isNegative() ? '' : '+'}${formatEth(rewardsDiff, 3)} ETH`
    reportDelay = txEvent.block.timestamp - lastReport.timestamp
    reportDelayDesc = formatDelay(reportDelay)
  }

  const metadata = {
    beaconBalance: `${newReport.beaconBalance.toFixed(0)}`,
    beaconValidators: `${newReport.beaconValidators}`,
    rewards: `${newReport.rewards.toFixed(0)}`,
    rewardsDiff: `${rewardsDiff == null ? 'null' : rewardsDiff.toFixed(0)}`,
    reportDelay: `${reportDelay == null ? 'null' : reportDelay}`,
  }

  findings.push(Finding.fromObject({
    name: 'Lido Oracle report',
    description: `Total balance: ${beaconBalanceEth} ETH, ` +
      `total validators: ${newReport.beaconValidators}, ` +
      `rewards: ${rewardsEth} ETH (${rewardsDiffDesc}), ` +
      `time since last report: ${reportDelayDesc}`,
    alertId: 'LIDO-ORACLE-REPORT',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata: metadata,
  }))

  if (lastReport != null && rewardsDiff!.isNegative()) {
    const rewardsDiffEth = formatEth(rewardsDiff, 3)
    const prevRewardsEth = formatEth(lastReport.rewards, 3)
    findings.push(Finding.fromObject({
      name: 'Lido Beacon rewards decreased',
      description: `Rewards decreased from ${prevRewardsEth} ETH to ${rewardsEth} ` +
        `by ${rewardsDiffEth} ETH`,
      alertId: 'LIDO-ORACLE-REWARDS-DECREASED',
      severity: FindingSeverity.Medium,
      type: FindingType.Degraded,
      metadata: {
        ...metadata,
        prevRewards: `${lastReport.rewards.toFixed(0)}`,
      },
    }))
  }

  lastReport = newReport
}


export async function waitBlockHandled(expectedBlockHash: string) {
  if (lastBlockHash !== expectedBlockHash) {
    throw new Error(`unexpected block hash`)
  }
  await fBlockHandled.promise
}


export async function waitTxHandled(expectedTxHash: string) {
  if (lastTxHash !== expectedTxHash) {
    throw new Error(`unexpected tx hash`)
  }
  await fTxHandled.promise
}


export function getLastOracleReport() {
  return lastReport == null ? null : {...lastReport}
}
