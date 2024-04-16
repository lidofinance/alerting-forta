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

    const latestL2Block = await app.zkSyncClient.getLatestL2Block()
    if (E.isLeft(latestL2Block)) {
      app.logger.error(latestL2Block.left)

      process.exit(1)
    }

    const agents: string[] = []
    for (const tProxyWatcher of app.tProxyWatchers) {
      const tProxyWatcherErr = await tProxyWatcher.initialize(latestL2Block.right.number)
      if (tProxyWatcherErr !== null) {
        app.logger.error(tProxyWatcherErr)

        process.exit(1)
      }

      metadata[`${tProxyWatcher.getName()}.lastAdmin`] = tProxyWatcher.getAdmin()
      metadata[`${tProxyWatcher.getName()}.lastImpl`] = tProxyWatcher.getImpl()
      metadata[`${tProxyWatcher.getName()}.lastOwner`] = tProxyWatcher.getOwner()

      agents.push(tProxyWatcher.getName())
    }

    const oProxyWorker = await app.oProxyWatcher.initialize(latestL2Block.right.number)
    if (oProxyWorker !== null) {
      app.logger.error(oProxyWorker)

      process.exit(1)
    }

    metadata[`${app.oProxyWatcher.getName()}.lastAdmin`] = app.oProxyWatcher.getAdmin()
    metadata[`${app.oProxyWatcher.getName()}.lastImpl`] = app.oProxyWatcher.getImpl()
    metadata[`${app.oProxyWatcher.getName()}.isOssified`] = String(app.oProxyWatcher.isOssified())
    agents.push(app.oProxyWatcher.getName())

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestL2Block.right.number)
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

    const l2BlocksDto = await app.blockSrv.getL2Blocks()
    if (E.isLeft(l2BlocksDto)) {
      isHandleBLockRunning = false
      return [l2BlocksDto.left]
    }
    app.logger.info(
      `ETH block ${blockEvent.blockNumber.toString()}. Fetched zkSync blocks from ${l2BlocksDto.right[0].number} to ${
        l2BlocksDto.right[l2BlocksDto.right.length - 1].number
      }. Total: ${l2BlocksDto.right.length}`,
    )

    const l2Logs = await app.blockSrv.getL2Logs(l2BlocksDto.right)
    if (E.isLeft(l2Logs)) {
      isHandleBLockRunning = false
      return [l2Logs.left]
    }

    const bridgeEventFindings = app.bridgeWatcher.handleLogs(l2Logs.right)
    const govEventFindings = app.govWatcher.handleLogs(l2Logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleLogs(l2Logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(l2Logs.right, l2BlocksDto.right)

    const l2BlockNumbersSet: Set<number> = new Set<number>()
    for (const log of l2Logs.right) {
      l2BlockNumbersSet.add(new BigNumber(log.blockNumber, 10).toNumber())
    }
    const l2BlockNumbers = Array.from(l2BlockNumbersSet).toSorted((a, b) => a - b)

    const proxyWatcherFindings: Finding[] = []
    for (const tProxyWatcher of app.tProxyWatchers) {
      const findings = await tProxyWatcher.handleL2Blocks(l2BlockNumbers)
      proxyWatcherFindings.push(...findings)
    }

    const [oProxyWatcherFindings, bridgeBalanceFindings] = await Promise.all([
      app.oProxyWatcher.handleL2Blocks(l2BlockNumbers),
      app.bridgeBalanceSrv.handleBlock(blockEvent.block.number, l2BlockNumbers),
    ])

    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
      ...proxyWatcherFindings,
      ...oProxyWatcherFindings,
      ...bridgeBalanceFindings,
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
