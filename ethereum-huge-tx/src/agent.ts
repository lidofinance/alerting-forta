import BigNumber from 'bignumber.js'

import {
  Initialize,
  BlockEvent,
  TransactionEvent,
  HandleBlock,
  HandleTransaction,
  Finding,
  FindingType,
  FindingSeverity,
} from 'forta-agent'

import {ethersProvider} from './ethers'

import { argv } from 'process';

import * as agentHugeTx from './agent-huge-tx'

import VERSION from './version'


type Metadata = {[key: string]: string}

interface SubAgent {
  name: string
  handleBlock?: HandleBlock
  handleTransaction?: HandleTransaction
  initialize?: (blockNumber: number) => Promise<Metadata>
}


const subAgents: SubAgent[] = [
  agentHugeTx
]

// block or tx handling should take no more than 5 sec. If not all processing is done it will be done later in background
const handlerResolveTimeout = 5000

const maxHandlerRetries = 5

let findingsOnInit: Finding[] = []
let blockFindingsCache: Finding[] = []
let txFindingsCache: Finding[] = []


const initialize = async () => {
  const metadata: Metadata = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  let blockNumber: number = -1

  if ( argv.includes("--block") ) {
    blockNumber = parseInt(argv[4])
  } else if ( argv.includes("--range") ) {
    blockNumber = parseInt(argv[4].slice(0, argv[4].indexOf(".")))
  } else if ( argv.includes("--tx") ) {
    const tx = await ethersProvider.getTransaction(argv[4])
    if (!tx) {
      throw new Error(`Can't find transaction ${argv[4]}`)
    }
    if (!tx.blockNumber) {
      throw new Error(`Transaction ${argv[4]} was not yet included into block`)
    }
    blockNumber = (await ethersProvider.getTransaction(argv[4])).blockNumber || -1
  }

  if (blockNumber == -1) {
    blockNumber = await ethersProvider.getBlockNumber()
  }

  await Promise.all(subAgents.map(async (agent, index) => {
    if (agent.initialize) {
      try {
        const agentMeta = await agent.initialize(blockNumber)
        for (const metaKey in agentMeta) {
          metadata[`${agent.name}.${metaKey}`] = agentMeta[metaKey]
        }
      } catch (err: any) {
        console.log(`Exiting due to init failure on ${agent.name}`)
        console.log(`Error: ${err}`)
        console.log(`Stack: ${err.stack}`)
        process.exit(1)
      }
    }
  }))

  metadata.agents = '[' + subAgents.map(a => `"${a.name}"`).join(', ') + ']'

  findingsOnInit.push(Finding.fromObject({
    name: 'Agent launched',
    description: `Version: ${VERSION.desc}`,
    alertId: 'LIDO-AGENT-LAUNCHED',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    metadata,
  }))
}


const handleBlock: HandleBlock = async (blockEvent: BlockEvent): Promise<Finding[]> => {

  let responseResolve: (value: Finding[]) => void

  const response = new Promise<Finding[]>((resolve,reject)=>{
    responseResolve = resolve
  });

  // we need to resolve Promise in handlerResolveTimeout maximum.
  // If not all handlers have finished execution we will leave them working in background
  const blockHandlingTimeout = setTimeout(function(){
    responseResolve(blockFindingsCache.splice(0, blockFindingsCache.length))
  },handlerResolveTimeout)

  // report findings from init. Will be done only for the first block report.
  if (findingsOnInit) {
    blockFindingsCache = findingsOnInit
    findingsOnInit = []
  }

  // run agents handlers
  Promise.all(subAgents.map(async agent => {
    if (agent.handleBlock) {
      let retries = maxHandlerRetries
      let success = false
      let lastError
      while (retries-- > 0 && !success) {
        try {
          const newFindings = await agent.handleBlock(blockEvent)
          if (newFindings.length) {
            enrichFindingsMetadata(newFindings)
            blockFindingsCache = blockFindingsCache.concat(newFindings)
          }
          success = true
        } catch (err) {
          lastError = err
        }
      }
      if (!success) {
        blockFindingsCache.push(errorToFinding(lastError, agent, 'handleBlock'))
      }
    }
  })).then(() => {
    // if all handlers have finished execution drop timeout and resolve promise
    clearTimeout(blockHandlingTimeout)
    responseResolve(blockFindingsCache.splice(0, blockFindingsCache.length))
  })

  return response
}


const handleTransaction: HandleTransaction = async (txEvent: TransactionEvent) => {

  let responseResolve: (value: Finding[]) => void

  const response = new Promise<Finding[]>((resolve,reject)=>{
    responseResolve = resolve
  });

  // we need to resolve Promise in handlerResolveTimeout maximum.
  // If not all handlers has finished execution we will left them working in background
  const txHandlingTimeout = setTimeout(function(){
    responseResolve(txFindingsCache.splice(0, txFindingsCache.length))
  },handlerResolveTimeout)

  // run agents handlers
  Promise.all(subAgents.map(async agent => {
    if (agent.handleTransaction) {
      let retries = maxHandlerRetries
      let success = false
      let lastError
      while (retries-- > 0 && !success) {
        try {
          const newFindings = await agent.handleTransaction(txEvent)
          if (newFindings.length) {
            enrichFindingsMetadata(newFindings)
            txFindingsCache = txFindingsCache.concat(newFindings)
          }
          success = true
        } catch (err) {
          lastError = err
        }
      }
      if (!success) {
        txFindingsCache.push(errorToFinding(lastError, agent, 'handleTransaction'))
      }
    }
  })).then(() => {
    // if all handlers have finished execution drop timeout and resolve promise
    clearTimeout(txHandlingTimeout)
    responseResolve(txFindingsCache.splice(0, txFindingsCache.length))
  })

  return response
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
  // not using initialize() since it doesn't provide the starting block number
  // which makes testing not as convenient
  initialize,
  handleBlock,
  handleTransaction,
}
