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
import * as agentEasyTrack from './agent-easy-track'
import * as agentDaoOps from './agent-dao-ops'

import VERSION from './version'


type Metadata = {[key: string]: string}

interface SubAgent {
  name: string
  handleBlock?: HandleBlock
  handleTransaction?: HandleTransaction
  initialize?: (blockNumber: number) => Promise<Metadata>
}


const subAgents: SubAgent[] = [
  // agentLidoOracle,
  // agentBethRewards,
  // agentPoolsRewards,
  // agentEasyTrack,
  agentDaoOps,
]

let initialized = false
let initializedPromise: Promise<void> | null = null


const initialize = async (blockNumber: number, findings: Finding[]) => {
  const metadata: Metadata = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  const launchFindingIndex = findings.length
  const failedAgentIndices: number[] = []

  await Promise.all(subAgents.map(async (agent, index) => {
    if (agent.initialize) {
      try {
        const agentMeta = await agent.initialize(blockNumber)
        for (const metaKey in agentMeta) {
          metadata[`${agent.name}.${metaKey}`] = agentMeta[metaKey]
        }
      } catch (err) {
        findings.push(errorToFinding(err, agent, 'initialize'))
        failedAgentIndices.push(index)
      }
    }
  }))

  failedAgentIndices.forEach((agentIndex, j) => {
    const agent = subAgents.splice(agentIndex - j, 1)[0]
    console.log(`WARN Removed failed agent ${agent.name}`)
  })

  metadata.agents = '[' + subAgents.map(a => `"${a.name}"`).join(', ') + ']'

  findings.splice(launchFindingIndex, 0, Finding.fromObject({
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

  await initializeIfNeeded(blockEvent.blockNumber, findings)

  await Promise.all(subAgents.map(async agent => {
    if (agent.handleBlock) {
      try {
        const newFindings = await agent.handleBlock(blockEvent)
        if (newFindings.length) {
          enrichFindingsMetadata(newFindings)
          findings = findings.concat(newFindings)
        }
      } catch (err) {
        findings.push(errorToFinding(err, agent, 'handleBlock'))
      }
    }
  }))

  return findings
}


const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {
  let findings: Finding[] = []

  await initializeIfNeeded(txEvent.blockNumber, findings)

  await Promise.all(subAgents.map(async agent => {
    if (agent.handleTransaction) {
      try {
        const newFindings = await agent.handleTransaction(txEvent)
        if (newFindings.length) {
          enrichFindingsMetadata(newFindings)
          findings = findings.concat(newFindings)
        }
      } catch (err) {
        findings.push(errorToFinding(err, agent, 'handleTransaction'))
      }
    }
  }))

  return findings
}


async function initializeIfNeeded(blockNumber: number, findings: Finding[]) {
  if (!initialized) {
    initialized = true
    initializedPromise = initialize(blockNumber, findings)
    await initializedPromise
    initializedPromise = null
  } else if (initializedPromise) {
    await initializedPromise
  }
}


function enrichFindingsMetadata(findings: Finding[]) {
  return findings.forEach(enrichFindingMetadata)
}


function enrichFindingMetadata(finding: Finding) {
  finding.metadata['version.commitHash'] = VERSION.commitHash
}


function errorToFinding(e: unknown, agent: SubAgent, fnName: string): Finding {
  const err: Error = (e instanceof Error) ? e : new Error(`non-Error thrown: ${e}`)
  const finding = Finding.fromObject({
    name: `Error in ${agent.name}.${fnName}`,
    description: `${err}`,
    alertId: 'LIDO-AGENT-ERROR',
    severity: FindingSeverity.High,
    type: FindingType.Degraded,
    metadata: { stack: `${err.stack}` },
  })
  enrichFindingMetadata(finding)
  return finding
}


export default {
  // not using initialize() since it doens't provide the starting block number
  // which makes testing not as convenient
  handleBlock,
  handleTransaction,
}
