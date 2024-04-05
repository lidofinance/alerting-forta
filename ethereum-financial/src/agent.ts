import { BlockEvent, Finding, FindingSeverity, FindingType, HandleBlock, HealthCheck } from 'forta-agent'
import * as process from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { App } from './app'
import { elapsedTime } from './utils/time'
import Version from './utils/version'
import { BlockDto } from './entity/events'

export function initialize(): Initialize {
  type Metadata = { [key: string]: string }

  const metadata: Metadata = {
    'version.commitHash': Version.commitHash,
    'version.commitMsg': Version.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const startTime = new Date().getTime()
    const app = await App.getInstance()

    const latestBlock = await app.ethClient.getLatestBlock()
    if (E.isLeft(latestBlock)) {
      app.logger.error(latestBlock.left.message)

      process.exit(1)
    }

    const blockDto: BlockDto = {
      number: latestBlock.right.number,
      timestamp: latestBlock.right.timestamp,
    }

    const [poolBalanceSrvErr] = await Promise.all([app.PoolBalanceSrv.init(blockDto)])
    if (poolBalanceSrvErr !== null) {
      app.logger.error(poolBalanceSrvErr)

      process.exit(1)
    }

    app.PoolBalanceCache.getState().forEach((value, key) => {
      metadata[key] = value
    })

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

    app.logger.info(elapsedTime('Agent.initialized', startTime) + '\n')
  }
}

export const handleBlock = (): HandleBlock => {
  return async function (blockEvent: BlockEvent): Promise<Finding[]> {
    const app = await App.getInstance()

    app.logger.info(`#ETH block: ${blockEvent.block.number}`)
    const startTime = new Date().getTime()

    const out: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      out.push(...findingsAsync)
    }

    const blockDto: BlockDto = {
      number: blockEvent.block.number,
      timestamp: blockEvent.block.timestamp,
    }

    const [aaveFindings, poolFindings] = await Promise.all([
      app.AaveSrv.handleBlock(blockDto),
      app.PoolBalanceSrv.handleBlock(blockDto),
    ])

    out.push(...aaveFindings, ...poolFindings)

    app.healthChecker.check(out)

    app.PoolBalanceCache.getState().forEach((value, key) => {
      app.logger.info(key + ' ' + value)
    })

    app.logger.info(elapsedTime('handleBlock', startTime) + '\n')

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
  healthCheck: healthCheck(),
}
