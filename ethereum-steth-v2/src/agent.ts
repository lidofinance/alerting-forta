import { BlockEvent, Finding, HandleBlock } from 'forta-agent'
import * as process from 'process'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './utils/time'

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
    const startStethOpHandleBlock = new Date().getTime()
    const bufferedEthFindings = await app.StethOperationSrv.handleBlock(blockEvent)
    console.log(elapsedTime('app.StethOperationSrv.handleBlock', startStethOpHandleBlock))

    out.push(...bufferedEthFindings)

    console.log(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBLockRunning = false
    return out
  }
}

export default {
  initialize: initialize(),
  handleBlock: handleBlock(),
}
