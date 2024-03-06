import { BlockEvent, decodeJwt, Finding, FindingSeverity, FindingType, HandleBlock, HealthCheck } from 'forta-agent'
import * as process from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import VERSION from './utils/version'
import { App } from './app'
import { elapsedTime } from './utils/time'
import BigNumber from 'bignumber.js'

export function initialize(): Initialize {
  type Metadata = { [key: string]: string }

  const metadata: Metadata = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const app = await App.getInstance()

    const token = await App.getJwt()
    if (E.isLeft(token)) {
      app.logger.error(token.left)

      process.exit(1)
    }

    const latestL2Block = await app.baseClient.getLatestL2Block()
    if (E.isLeft(latestL2Block)) {
      app.logger.error(latestL2Block.left)
      process.exit(1)
    }

    const agents: string[] = []
    for (const proxyWatcher of app.proxyWatchers) {
      const proxyWatcherErr = await proxyWatcher.initialize(latestL2Block.right.number)
      if (proxyWatcherErr !== null) {
        app.logger.error(proxyWatcherErr)
        process.exit(1)
      }

      metadata[`${proxyWatcher.getName()}.lastAdmin`] = proxyWatcher.getAdmin()
      metadata[`${proxyWatcher.getName()}.lastImpl`] = proxyWatcher.getImpl()

      agents.push(proxyWatcher.getName())
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestL2Block.right.number)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      app.logger.error(monitorWithdrawalsInitResp.left)

      process.exit(1)
    }

    metadata[`${app.monitorWithdrawals.getName()}.currentWithdrawals`] =
      monitorWithdrawalsInitResp.right.currentWithdrawals

    agents.push(app.monitorWithdrawals.getName())

    metadata.agents = '[' + agents.toString() + ']'
    const decodedJwt = decodeJwt(token.right)

    await app.findingsRW.write([
      Finding.fromObject({
        name: `Agent launched, ScannerId: ${decodedJwt.payload.sub}`,
        description: `Version: ${VERSION.desc}`,
        alertId: 'LIDO-AGENT-LAUNCHED',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata,
      }),
    ])

    app.logger.info('Bot initialization is done!')
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

    const findings: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      findings.push(...findingsAsync)
    }

    const l2blocksDto = await app.blockSrv.getL2Blocks()
    if (E.isLeft(l2blocksDto)) {
      isHandleBLockRunning = false
      return [l2blocksDto.left]
    }
    app.logger.info(
      `ETH block ${blockEvent.blockNumber.toString()}. Fetched base blocks from ${l2blocksDto.right[0].number} to ${
        l2blocksDto.right[l2blocksDto.right.length - 1].number
      }. Total: ${l2blocksDto.right.length}`,
    )

    const l2logs = await app.blockSrv.getL2Logs(l2blocksDto.right)
    if (E.isLeft(l2logs)) {
      isHandleBLockRunning = false
      return [l2logs.left]
    }

    const bridgeEventFindings = app.bridgeWatcher.handleLogs(l2logs.right)
    const govEventFindings = app.govWatcher.handleLogs(l2logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleLogs(l2logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(l2logs.right, l2blocksDto.right)

    const l2BlockNumbers: Set<number> = new Set<number>()
    for (const l2log of l2logs.right) {
      l2BlockNumbers.add(new BigNumber(l2log.blockNumber, 10).toNumber())
    }

    const proxyWatcherFindings: Finding[] = []

    for (const proxyWatcher of app.proxyWatchers) {
      const fnds = await proxyWatcher.handleBlocks(Array.from(l2BlockNumbers))
      proxyWatcherFindings.push(...fnds)
    }

    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
      ...proxyWatcherFindings,
    )

    app.healthChecker.check(findings)

    app.logger.info(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBLockRunning = false
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
  healthCheck: healthCheck(),
}
