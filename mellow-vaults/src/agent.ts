import {
  BlockEvent,
  Finding,
  FindingSeverity,
  FindingType,
  HandleBlock,
  HealthCheck,
  HandleTransaction,
} from 'forta-agent'
import * as process from 'process'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './shared/time'
import Version from './shared/version'
import { Metadata } from './entity/metadata'
import { TransactionEvent } from 'forta-agent'
import { BlockDto } from './entity/events'

export function initialize(): Initialize {
  const metadata: Metadata = {
    'version.commitHash': Version.commitHash,
    'version.commitMsg': Version.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const startTime = new Date().getTime()
    const app = await App.getInstance()

    const latestBlock = await app.ethClient.getStartedBlockForApp(argv)
    if (E.isLeft(latestBlock)) {
      console.error(`Error: ${latestBlock.left.message}`)
      console.error(`Stack: ${latestBlock.left.stack}`)

      process.exit(1)
    }

    const lastBlockNumber = latestBlock.right.number
    const [vaultWatcherSrvErr] = await Promise.all([
      app.VaultWatcherSrv.initialize(lastBlockNumber),
      app.MultisigWatcherSrv.initialize(lastBlockNumber),
      app.AclChangesSrv.initialize(lastBlockNumber),
    ])

    if (vaultWatcherSrvErr !== null) {
      console.error(`Error: ${vaultWatcherSrvErr.message}`)
      console.error(`Stack: ${vaultWatcherSrvErr.stack}`)

      process.exit(1)
    }

    const agents = [app.VaultWatcherSrv.getName(), app.MultisigWatcherSrv.getName(), app.AclChangesSrv.getName()]
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
    console.log(`#ETH block: ${blockEvent.block.number}`)
    const startTime = new Date().getTime()

    const app = await App.getInstance()

    const findings: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      findings.push(...findingsAsync)
    }

    const blockDtoEvent: BlockDto = {
      number: blockEvent?.block?.number,
      timestamp: blockEvent?.block?.timestamp,
      parentHash: blockEvent?.block?.parentHash,
    }

    const vaultWatcherSrvFindings = await app.VaultWatcherSrv.handleBlock(blockDtoEvent)
    const aclChangesSrvFindings = await app.AclChangesSrv.handleBlock(blockDtoEvent)
    findings.push(...vaultWatcherSrvFindings, ...aclChangesSrvFindings)

    console.log(elapsedTime('handleBlock', startTime) + '\n')
    return findings
  }
}

export const handleTransaction = (): HandleTransaction => {
  return async function (txEvent: TransactionEvent): Promise<Finding[]> {
    const app = await App.getInstance()

    const vaultFindings = await app.VaultWatcherSrv.handleTransaction(txEvent)
    const multisigFindings = await app.MultisigWatcherSrv.handleTransaction(txEvent)

    const findings = [...vaultFindings, ...multisigFindings]
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
