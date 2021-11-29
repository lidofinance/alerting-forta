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

import VERSION from './version'


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


const initialize = async (blockNumber: number, findings: Finding[]) => {
  await Promise.all(subAgents.map(
    a => a.initialize?  a.initialize(blockNumber) : EMPTY_PROMISE
  ))
  findings.push(Finding.fromObject({
    name: 'Agent launched',
    description: `Version: ${VERSION.desc}`,
    alertId: 'LIDO-AGENT-LAUNCHED',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata: {
      'version.commitHash': VERSION.commitHash,
      'version.commitMsg': VERSION.commitMsg,
    }
  }))
}


const handleBlock: HandleBlock = async (blockEvent: BlockEvent): Promise<Finding[]> => {
  let findings: Finding[] = []

  if (!initialized) {
    initialized = true
    await initialize(blockEvent.blockNumber, findings)
  }

  await Promise.all(subAgents.map(async agent => {
    if (agent.handleBlock) {
      const newFindings = await agent.handleBlock(blockEvent)
      if (newFindings.length) {
        enrichFindingsMetadata(newFindings)
        findings = findings.concat(newFindings)
      }
    }
  }))

  return findings
}


const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  let findings: Finding[] = []

  if (!initialized) {
    initialized = true
    await initialize(txEvent.blockNumber, findings)
  }

  await Promise.all(subAgents.map(async agent => {
    if (agent.handleTransaction) {
      const newFindings = await agent.handleTransaction(txEvent)
      if (newFindings.length) {
        enrichFindingsMetadata(newFindings)
        findings = findings.concat(newFindings)
      }
    }
  }))

  return findings
}


function enrichFindingsMetadata(findings: Finding[]) {
  return findings.forEach(enrichFindingMetadata)
}


function enrichFindingMetadata(finding: Finding) {
  finding.metadata['version.commitHash'] = VERSION.commitHash
}


export default {
  // not using initialize() since it doens't provide the starting block number
  // which makes testing not as convenient
  handleBlock,
  handleTransaction,
}
