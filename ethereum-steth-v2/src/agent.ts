import { BlockEvent, Finding, FindingSeverity, FindingType, HandleBlock, HandleTransaction } from 'forta-agent'
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

export function initialize(): Initialize {
  const metadata: Metadata = {
    'version.commitHash': Version.commitHash,
    'version.commitMsg': Version.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const startTime = new Date().getTime()
    const app = await App.getInstance()

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

    await app.findingsRW.write([
      Finding.fromObject({
        name: 'Agent launched',
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

let isHandleBLockRunning: boolean = false
export const handleBlock = (): HandleBlock => {
  return async function (blockEvent: BlockEvent): Promise<Finding[]> {
    const startTime = new Date().getTime()
    if (isHandleBLockRunning) {
      return []
    }

    isHandleBLockRunning = true
    const app = await App.getInstance()

    const out: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      out.push(...findingsAsync)
    }

    const [bufferedEthFindings, withdrawalsFindings, gateSealFindings, vaultFindings] = await Promise.all([
      app.StethOperationSrv.handleBlock(blockEvent),
      app.WithdrawalsSrv.handleBlock(blockEvent),
      app.GateSealSrv.handleBlock(blockEvent),
      app.VaultSrv.handleBlock(blockEvent),
    ])
    out.push(...bufferedEthFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

    console.log(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBLockRunning = false
    return out
  }
}

let isHandleTransactionRunning: boolean = false
export const handleTransaction = (): HandleTransaction => {
  return async function (txEvent: TransactionEvent): Promise<Finding[]> {
    const startTime = new Date().getTime()
    if (isHandleTransactionRunning) {
      return []
    }
    isHandleTransactionRunning = true
    const app = await App.getInstance()
    const out: Finding[] = []

    const stethOperationFindings = app.StethOperationSrv.handleTransaction(txEvent)
    const withdrawalsFindings = app.WithdrawalsSrv.handleTransaction(txEvent)
    const gateSealFindings = app.GateSealSrv.handleTransaction(txEvent)
    const vaultFindings = app.VaultSrv.handleTransaction(txEvent)

    out.push(...stethOperationFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

    console.log(elapsedTime('handleTransaction', startTime) + '\n')
    isHandleTransactionRunning = false
    return out
  }
}

export default {
  initialize: initialize(),
  handleBlock: handleBlock(),
  handleTransaction: handleTransaction(),
}
