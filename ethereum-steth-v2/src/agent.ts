import { BlockEvent, Finding, FindingSeverity, FindingType, HandleBlock } from 'forta-agent'
import * as process from 'process'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './utils/time'
import { StethOperationSrv } from './services/steth_operation/StethOperation.srv'

export function initialize(): Initialize {
  /*  const metadata: Metadata = {
      'version.commitHash': VERSION.commitHash,
      'version.commitMsg': VERSION.commitMsg,
    }*/

  return async function (): Promise<InitializeResponse | void> {
    const startTime = new Date().getTime()
    const app = await App.getInstance()

    const latestBlockNumber = await app.ethClient.getStartedBlockForApp(argv)
    if (E.isLeft(latestBlockNumber)) {
      console.log(`Error: ${latestBlockNumber.left.message}`)
      console.log(`Stack: ${latestBlockNumber.left.stack}`)

      process.exit(1)
    }

    const startStethOperationSrv = new Date().getTime()
    const err = await app.StethOperationSrv.initialize(latestBlockNumber.right)
    if (err !== null) {
      console.log(`Error: ${err.message}`)
      console.log(`Stack: ${err.stack}`)

      process.exit(1)
    }

    console.log(elapsedTime('App.StethOperationSrv.initialize', startStethOperationSrv))
    console.log(elapsedTime('Agent.initialize', startTime) + '\n')
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
    const startHandleBufferedEth = new Date().getTime()
    const bufferedEth = await app.StethOperationSrv.handleBufferedEth(blockEvent)
    if (E.isLeft(bufferedEth)) {
      const f: Finding = Finding.fromObject({
        name: `Error in ${StethOperationSrv.name}.${app.StethOperationSrv.handleBufferedEth.name}:55`,
        description: `Handle handleBufferedEth is failed. Cause: ${bufferedEth.left.message}`,
        alertId: 'LIDO-AGENT-ERROR',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
        metadata: { stack: `${bufferedEth.left.stack}` },
      })

      out.push(f)
    }
    console.log(elapsedTime('app.StethOperationSrv.handleBufferedEth', startHandleBufferedEth))

    console.log(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBLockRunning = false
    return out
  }
}

export default {
  initialize: initialize(),
  handleBlock: handleBlock(),
}
