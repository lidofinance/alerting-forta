import { decodeJwt, Finding, FindingSeverity, FindingType, HandleTransaction, HealthCheck } from 'forta-agent'
import * as process from 'process'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './utils/time'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import Version from './utils/version'

type Metadata = { [key: string]: string }

export function initialize(): Initialize {
  const metadata: Metadata = {
    'version.commitHash': Version.commitHash,
    'version.commitMsg': Version.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const startTime = new Date().getTime()
    const app = await App.getInstance()

    const token = await App.getJwt()
    if (E.isLeft(token)) {
      console.error(`Error: ${token.left.message}`)
      console.error(`Stack: ${token.left.stack}`)

      process.exit(1)
    }

    const latestBlockNumber = await app.bscClient.getBlockNumber(argv)
    if (E.isLeft(latestBlockNumber)) {
      console.error(`Error: ${latestBlockNumber.left.message}`)
      console.error(`Stack: ${latestBlockNumber.left.stack}`)

      process.exit(1)
    }

    app.crossChainControllerSrv.initialize(latestBlockNumber.right)

    const agents: string[] = [app.crossChainControllerSrv.getName()]
    metadata.agents = '[' + agents.toString() + ']'

    const decodedJwt = decodeJwt(token.right)

    await app.findingsRW.write([
      Finding.fromObject({
        name: `Agent launched, ScannerId: ${decodedJwt.payload.sub}`,
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

export const handleTransaction = (): HandleTransaction => {
  return async function (txEvent: TransactionEvent): Promise<Finding[]> {
    const app = await App.getInstance()

    const findings: Finding[] = (
      await Promise.all([
        app.crossChainExecutorWatcherSrv.handleTransaction(txEvent),
        await app.crossChainControllerSrv.handleTransaction(txEvent),
      ])
    ).flat()

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
  handleTransaction: handleTransaction(),
  healthCheck: healthCheck(),
}
