import { BlockEvent, Finding, FindingSeverity, FindingType, HandleTransaction, HealthCheck } from 'forta-agent'
import * as process from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { HandleBlock, Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './utils/time'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import Version from './version'

type Metadata = { [key: string]: string }

export function initialize(): Initialize {
  const metadata: Metadata = {
    'version.commitHash': Version.commitHash,
    'version.commitMsg': Version.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const startTime = new Date().getTime()
    const app = await App.getInstance()

    const latestBlockNumber = await app.bscClient.getBlockNumber()
    if (E.isLeft(latestBlockNumber)) {
      console.error(`Error: ${latestBlockNumber.left.message}`)
      console.error(`Stack: ${latestBlockNumber.left.stack}`)

      process.exit(1)
    }

    const crossChainControllerSrvErr = await app.crossChainControllerSrv.initialize(latestBlockNumber.right)

    if (crossChainControllerSrvErr !== null) {
      console.error(`Error: ${crossChainControllerSrvErr.message}`)
      console.error(`Stack: ${crossChainControllerSrvErr.stack}`)

      process.exit(1)
    }

    const agents: string[] = [
      app.crossChainControllerSrv.getName(),
      app.crossChainExecutorWatcherSrv.getName(),
      app.bscAclChangesSrv.getName(),
    ]

    metadata.agents = '[' + agents.toString() + ']'

    await app.findingsRW.write([
      Finding.fromObject({
        name: `Agent launched`,
        description: `Version: ${Version.desc}`,
        alertId: 'LIDO-AGENT-LAUNCHED',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata,
      }),
    ])

    console.log(elapsedTime('Agent.initialize', startTime) + '\n')
  }
}

export const handleBlock = (): HandleBlock => {
  return async function (blockEvent: BlockEvent): Promise<Finding[]> {
    console.log(`#BSC block: ${blockEvent.block.number}`)
    const startTime = new Date().getTime()

    const app = await App.getInstance()

    const findings: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      findings.push(...findingsAsync)
    }
    const [crossChainControllerFindings, bscAclChangesFindings] = await Promise.all([
      app.crossChainControllerSrv.handleBlock(blockEvent),
      app.bscAclChangesSrv.handleBlock(blockEvent),
    ])
    findings.push(...crossChainControllerFindings, ...bscAclChangesFindings)

    app.healthChecker.check(findings)

    console.log(elapsedTime('handleBlock', startTime) + '\n')
    return findings
  }
}

export const handleTransaction = (): HandleTransaction => {
  return async function (txEvent: TransactionEvent): Promise<Finding[]> {
    const app = await App.getInstance()
    const findings: Finding[] = []

    const crossChainExecutorFindings = app.crossChainExecutorWatcherSrv.handleTransaction(txEvent)
    const crossChainControllerFindings = await app.crossChainControllerSrv.handleTransaction(txEvent)

    findings.push(...crossChainExecutorFindings, ...crossChainControllerFindings)

    app.healthChecker.check(findings)

    return findings
  }
}

export const healthCheck = (): HealthCheck => {
  return async function (): Promise<string[] | void> {
    const app = await App.getInstance()

    if (!app.healthChecker.isHealth()) {
      return ['There is too much network errors']
    }

    return []
  }
}

export default {
  initialize: initialize(),
  handleBlock: handleBlock(),
  handleTransaction: handleTransaction(),
  healthCheck: healthCheck(),
}
