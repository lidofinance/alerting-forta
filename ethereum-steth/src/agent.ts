import {
  BlockEvent,
  decodeJwt,
  Finding,
  FindingSeverity,
  FindingType,
  HandleBlock,
  HandleTransaction,
  HealthCheck,
} from 'forta-agent'
import * as process from 'process'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './utils/time'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { Metadata } from './entity/metadata'
import Version from './utils/version'
import { ETH_DECIMALS } from './utils/constants'
import { BlockDto, TransactionDto } from './entity/events'
import BigNumber from 'bignumber.js'

export function initialize(): Initialize {
  const metadata: Metadata = {
    'version.commitHash': Version.commitHash,
    'version.commitMsg': Version.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const startTime = new Date().getTime()
    const app = await App.getInstance()

    try {
      await app.db.migrate.latest()

      console.log('Migrations have been run successfully.')
    } catch (error) {
      console.error('Error running migrations:', error)
      process.exit(1)
    }

    const token = await App.getJwt()
    if (E.isLeft(token)) {
      console.log(`Error: ${token.left.message}`)
      console.log(`Stack: ${token.left.stack}`)

      process.exit(1)
    }

    const latestBlockNumber = await app.ethClient.getStartedBlockForApp(argv)
    if (E.isLeft(latestBlockNumber)) {
      console.log(`Error: ${latestBlockNumber.left.message}`)
      console.log(`Stack: ${latestBlockNumber.left.stack}`)

      process.exit(1)
    }

    const [stethOperationSrvErr, withdrawalsSrvErr, gateSealSrvErr] = await Promise.all([
      app.StethOperationSrv.initialize(latestBlockNumber.right),
      app.WithdrawalsSrv.initialize(latestBlockNumber.right),
      app.GateSealSrv.initialize(latestBlockNumber.right),
      app.VaultSrv.initialize(latestBlockNumber.right),
    ])
    if (stethOperationSrvErr !== null) {
      console.log(`Error: ${stethOperationSrvErr.message}`)
      console.log(`Stack: ${stethOperationSrvErr.stack}`)

      process.exit(1)
    }

    if (withdrawalsSrvErr !== null) {
      console.log(`Error: ${withdrawalsSrvErr.message}`)
      console.log(`Stack: ${withdrawalsSrvErr.stack}`)

      process.exit(1)
    }

    if (gateSealSrvErr instanceof Error) {
      console.log(`Error: ${gateSealSrvErr.message}`)
      console.log(`Stack: ${gateSealSrvErr.stack}`)

      process.exit(1)
    } else {
      await app.findingsRW.write(gateSealSrvErr)
    }

    const agents: string[] = [
      app.StethOperationSrv.getName(),
      app.WithdrawalsSrv.getName(),
      app.GateSealSrv.getName(),
      app.VaultSrv.getName(),
    ]
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
    console.log(
      `[${app.StethOperationSrv.getName()}] Last Depositor TxTime: ${new Date(
        app.StethOperationSrv.getStorage().getLastDepositorTxTime() * 1000,
      ).toUTCString()}`,
    )
    console.log(
      `[${app.StethOperationSrv.getName()}] Buffered Eth: ${app.StethOperationSrv.getStorage()
        .getLastBufferedEth()
        .div(ETH_DECIMALS)
        .toFixed(2)} on ${latestBlockNumber.right} block`,
    )
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

    const out: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      out.push(...findingsAsync)
    }

    const blockDto: BlockDto = {
      number: blockEvent.block.number,
      timestamp: blockEvent.block.timestamp,
      parentHash: blockEvent.block.parentHash,
    }

    const [bufferedEthFindings, withdrawalsFindings, gateSealFindings, vaultFindings] = await Promise.all([
      app.StethOperationSrv.handleBlock(blockDto),
      app.WithdrawalsSrv.handleBlock(blockDto),
      app.GateSealSrv.handleBlock(blockDto),
      app.VaultSrv.handleBlock(blockDto),
    ])

    out.push(...bufferedEthFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

    app.healthChecker.check(out)

    console.log(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBlockRunning = false
    return out
  }
}

let isHandleTransactionRunning: boolean = false
export const handleTransaction = (): HandleTransaction => {
  return async function (txEvent: TransactionEvent): Promise<Finding[]> {
    if (isHandleTransactionRunning) {
      return []
    }
    isHandleTransactionRunning = true
    const app = await App.getInstance()
    const out: Finding[] = []

    const txDto: TransactionDto = {
      logs: txEvent.logs,
      to: txEvent.to,
      timestamp: txEvent.timestamp,
      block: {
        timestamp: txEvent.block.timestamp,
        number: new BigNumber(txEvent.block.number, 10).toNumber(),
      },
    }

    const withdrawalsFindings = await app.WithdrawalsSrv.handleTransaction(txDto)
    const stethOperationFindings = await app.StethOperationSrv.handleTransaction(txDto)
    const gateSealFindings = app.GateSealSrv.handleTransaction(txDto)
    const vaultFindings = app.VaultSrv.handleTransaction(txDto)

    out.push(...stethOperationFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

    app.healthChecker.check(out)

    isHandleTransactionRunning = false
    return out
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
