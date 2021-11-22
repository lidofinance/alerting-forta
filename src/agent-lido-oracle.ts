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
}

// re-fetched from history on startup
let lastOracleReport: OracleReport = {
  timestamp: 0,
  beaconBalance: new BigNumber(0),
  beaconValidators: 0
}

let lastTriggeredAt = 0

const fBlockHandled = makeFuture<void>()
const fTxHandled = makeFuture<void>()

let lastBlockHash: string
let lastTxHash: string


export async function initialize(currentBlock: number) {
  const lidoOracle = new ethers.Contract(LIDO_ORACLE_ADDRESS, LIDO_ORACLE_ABI, ethersProvider)
  const oracleReportFilter = lidoOracle.filters.Completed()

  // ~2 days ago
  const pastBlock = currentBlock - Math.ceil(50 * 60 * 60 / 13)
  const reportEvents = await lidoOracle.queryFilter(oracleReportFilter, pastBlock, currentBlock)

  if (reportEvents.length > 0) {
    const byBlockNumberDesc = (e1: Event, e2: Event) => e2.blockNumber - e1.blockNumber

    reportEvents.sort(byBlockNumberDesc)
    const lastReportEvent = reportEvents[0]

    const lastBlock = await lastReportEvent.getBlock()
    const {beaconBalance, beaconValidators} = (lastReportEvent.args || lastOracleReport)

    lastOracleReport = {
      timestamp: lastBlock.timestamp,
      beaconBalance: new BigNumber(String(beaconBalance)),
      beaconValidators: +beaconValidators,
    }
  }

  console.log('lastOracleReport:', lastOracleReport)
}


export async function handleBlock(blockEvent: BlockEvent) {
  lastBlockHash = blockEvent.blockHash
  fBlockHandled.reset()

  const findings: Finding[] = []
  const now = blockEvent.block.timestamp
  const reportDelay = now - lastOracleReport.timestamp

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


function handleOracleTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [completedEvent] = txEvent.filterLog(LIDO_ORACLE_COMPLETED_EVENT, LIDO_ORACLE_ADDRESS)
  if (completedEvent == undefined) {
    return
  }

  const {beaconBalance, beaconValidators} = completedEvent.args
  const beaconBalanceEth = formatEth(beaconBalance, 3)

  lastOracleReport = {
    timestamp: txEvent.block.timestamp,
    beaconBalance: new BigNumber(String(beaconBalance)),
    beaconValidators: +beaconValidators,
  }

  findings.push(Finding.fromObject({
    name: 'Lido Oracle report',
    description: `Total balance: ${beaconBalanceEth} ETH, total validators: ${beaconValidators}`,
    alertId: 'LIDO-ORACLE-REPORT',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata: {
      beaconBalance: `${beaconBalance}`,
      beaconValidators: `${beaconValidators}`,
    },
  }))
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
  return {...lastOracleReport}
}
