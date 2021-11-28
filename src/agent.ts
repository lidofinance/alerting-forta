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
import * as agentPoolsRewards from './agent-pools-rewards'

import VERSION from './version'


interface SubAgent {
  name: string
  handleBlock?: HandleBlock
  handleTransaction?: HandleTransaction
  initialize?: (blockNumber: number) => Promise<{[key: string]: string}>
}


const EMPTY_PROMISE = new Promise<void>(resolve => resolve())


const subAgents: SubAgent[] = [
  // agentLidoOracle,
  // agentBethRewards,
  agentPoolsRewards,
]

let initialized = false


const initialize = async (blockNumber: number, findings: Finding[]) => {
  const metadata: {[key: string]: string} = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  await Promise.all(subAgents.map(async agent => {
    if (agent.initialize) {
      const agentMeta = await agent.initialize(blockNumber)
      for (const metaKey in agentMeta) {
        metadata[`${agent.name}.${metaKey}`] = agentMeta[metaKey]
      }
    }
  }))

  findings.push(Finding.fromObject({
    name: 'Agent launched',
    description: `Version: ${VERSION.desc}`,
    alertId: 'LIDO-AGENT-LAUNCHED',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata,
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
  // handleTransaction,
}
