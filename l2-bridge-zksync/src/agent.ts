import { BlockEvent, Finding, FindingSeverity, FindingType, HandleBlock, HealthCheck } from 'forta-agent'
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

    const latestBlock = await app.zkSyncClient.getLatestBlock()
    if (E.isLeft(latestBlock)) {
      app.logger.error(latestBlock.left)

      process.exit(1)
    }

    const agents: string[] = []
    for (const tProxyWatcher of app.tProxyWatchers) {
      const tProxyWatcherErr = await tProxyWatcher.initialize(latestBlock.right.number)
      if (tProxyWatcherErr !== null) {
        app.logger.error(tProxyWatcherErr)

        process.exit(1)
      }

      metadata[`${tProxyWatcher.getName()}.lastAdmin`] = tProxyWatcher.getAdmin()
      metadata[`${tProxyWatcher.getName()}.lastImpl`] = tProxyWatcher.getImpl()
      metadata[`${tProxyWatcher.getName()}.lastOwner`] = tProxyWatcher.getOwner()

      agents.push(tProxyWatcher.getName())
    }

    const oProxyWorker = await app.oProxyWatcher.initialize(latestBlock.right.number)
    if (oProxyWorker !== null) {
      app.logger.error(oProxyWorker)

      process.exit(1)
    }

    metadata[`${app.oProxyWatcher.getName()}.lastAdmin`] = app.oProxyWatcher.getAdmin()
    metadata[`${app.oProxyWatcher.getName()}.lastImpl`] = app.oProxyWatcher.getImpl()
    metadata[`${app.oProxyWatcher.getName()}.isOssified`] = String(app.oProxyWatcher.isOssified())
    agents.push(app.oProxyWatcher.getName())

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestBlock.right.number)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      app.logger.error(monitorWithdrawalsInitResp.left)

      process.exit(1)
    }

    metadata[`${app.monitorWithdrawals.getName()}.currentWithdrawals`] =
      monitorWithdrawalsInitResp.right.currentWithdrawals

    agents.push(app.monitorWithdrawals.getName())
    metadata.agents = '[' + agents.toString() + ']'

    await app.findingsRW.write([
      Finding.fromObject({
        name: 'Agent launched',
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

    const blocksDto = await app.blockSrv.getBlocks()
    if (E.isLeft(blocksDto)) {
      isHandleBLockRunning = false
      return [blocksDto.left]
    }
    app.logger.info(
      `ETH block ${blockEvent.blockNumber.toString()}. Fetched zkSync blocks from ${blocksDto.right[0].number} to ${
        blocksDto.right[blocksDto.right.length - 1].number
      }. Total: ${blocksDto.right.length}`,
    )

    const logs = await app.blockSrv.getLogs(blocksDto.right)
    if (E.isLeft(logs)) {
      isHandleBLockRunning = false
      return [logs.left]
    }

    const bridgeEventFindings = app.bridgeWatcher.handleLogs(logs.right)
    const govEventFindings = app.govWatcher.handleLogs(logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleLogs(logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(logs.right, blocksDto.right)

    const blockNumbers: Set<number> = new Set<number>()
    for (const log of logs.right) {
      blockNumbers.add(new BigNumber(log.blockNumber, 10).toNumber())
    }

    const proxyWatcherFindings: Finding[] = []

    for (const tProxyWatcher of app.tProxyWatchers) {
      const findings = await tProxyWatcher.handleBlocks(Array.from(blockNumbers))
      proxyWatcherFindings.push(...findings)
    }

    const oProxyWatcherFindings = await app.oProxyWatcher.handleBlocks(Array.from(blockNumbers))

    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
      ...proxyWatcherFindings,
      ...oProxyWatcherFindings,
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
