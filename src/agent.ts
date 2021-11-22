import BigNumber from 'bignumber.js'

import {
  BlockEvent,
  TransactionEvent,
  HandleBlock,
  HandleTransaction,
  Finding,
  FindingType,
  FindingSeverity,
} from 'forta-agent'

import * as agentLidoOracle from './agent-lido-oracle'
import * as agentBethRewards from './agent-beth-rewards'


interface SubAgent {
  handleBlock?: HandleBlock
  handleTransaction?: HandleTransaction
  initialize?: (blockNumber: number) => Promise<void>
}


const EMPTY_PROMISE = new Promise<void>(resolve => resolve())


const subAgents: SubAgent[] = [
  agentLidoOracle,
  agentBethRewards,
]

let initialized = false


const initialize = async (blockNumber: number) => {
  await Promise.all(subAgents.map(
    a => a.initialize?  a.initialize(blockNumber) : EMPTY_PROMISE
  ))
}


let blockFindings: Finding[] = []


const handleBlock: HandleBlock = async (blockEvent: BlockEvent): Promise<Finding[]> => {
  if (!initialized) {
    initialized = true
    await initialize(blockEvent.blockNumber)
  }

  await Promise.all(subAgents.map(async agent => {
    if (agent.handleBlock) {
      const newFindings = await agent.handleBlock(blockEvent)
      if (newFindings.length) {
        blockFindings = blockFindings.concat(newFindings)
      }
    }
  }))

  // temporary fix for Defender not forwarding Forta block findings:
  // report them in the block's first tx instead
  return []
}


const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  const wasInitialized = initialized

  if (!initialized) {
    initialized = true
    await initialize(txEvent.blockNumber)
  }

  let findings: Finding[]

  if (blockFindings.length > 0) {
    findings = blockFindings
    blockFindings = []
  } else {
    findings = []
  }

  if (!wasInitialized) {
    findings.push(Finding.fromObject({
      name: 'Agent launched',
      description: `Agent launched on a new machine`,
      alertId: 'LIDO-AGENT-LAUNCHED',
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    }))
  }

  await Promise.all(subAgents.map(async agent => {
    if (agent.handleTransaction) {
      const newFindings = await agent.handleTransaction(txEvent)
      if (newFindings.length) {
        findings = findings.concat(newFindings)
      }
    }
  }))

  return findings
}


export default {
  // not using initialize() since it doens't provide the starting block number
  // which makes testing not as convenient
  handleBlock,
  handleTransaction,
}
