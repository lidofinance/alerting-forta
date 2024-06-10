import { BlockEvent, decodeJwt, Finding, FindingSeverity, FindingType, HandleBlock, HealthCheck, HandleTransaction } from 'forta-agent'
import * as process from 'process'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './shared/time'
import Version from './shared/version'
import { Metadata } from './entity/metadata'
import { TransactionEventContract } from './shared/notice'

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

    const latestBlock = await app.ethClient.getStartedBlockForApp(argv)
    if (E.isLeft(latestBlock)) {
      console.error(`Error: ${latestBlock.left.message}`)
      console.error(`Stack: ${latestBlock.left.stack}`)

      process.exit(1)
    }

    const vaultWatcherSrvErr = await app.VaultWatcherSrv.initialize(latestBlock.right.number)

    if (vaultWatcherSrvErr !== null) {
      console.error(`Error: ${vaultWatcherSrvErr.message}`)
      console.error(`Stack: ${vaultWatcherSrvErr.stack}`)

      process.exit(1)
    }

    const agents = [app.VaultWatcherSrv.getName()]
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

let isHandleBlockRunning: boolean = false
export const handleBlock = (): HandleBlock => {
  return async function (blockEvent: BlockEvent): Promise<Finding[]> {
    console.log(`#ETH block: ${blockEvent.block.number}`)
    const startTime = new Date().getTime()
    if (isHandleBlockRunning) {
      return []
    }

    isHandleBlockRunning = true
    const app = await App.getInstance()

    const findings: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      findings.push(...findingsAsync)
    }

    const servicesFindings = await app.VaultWatcherSrv.handleBlock(blockEvent)
    findings.push(...servicesFindings)

    console.log(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBlockRunning = false
    return findings
  }
}

export const handleTransaction = (): HandleTransaction => {
  return async function (txEvent: TransactionEventContract): Promise<Finding[]> {
    const app = await App.getInstance()

    const findings = await app.VaultWatcherSrv.handleTransaction(txEvent)

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
