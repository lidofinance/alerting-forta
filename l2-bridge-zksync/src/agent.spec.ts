import { App } from './app'
import * as E from 'fp-ts/Either'
import { Finding } from 'forta-agent'
import BigNumber from 'bignumber.js'

describe('agent-zkSync functional tests', () => {
  test('should process handleBlocks', async () => {
    const app = await App.getInstance()

    const l1BlockNumber = 19_668_703
    const start = 31_653_586
    const latestL2Block = 31_653_636

    const l2BlocksDto = await app.zkSyncClient.fetchL2Blocks(start, latestL2Block)

    for (const tProxyWatcher of app.tProxyWatchers) {
      const tProxyWatcherErr = await tProxyWatcher.initialize(latestL2Block)
      if (tProxyWatcherErr !== null) {
        throw tProxyWatcherErr
      }
    }

    const oProxyWorker = await app.oProxyWatcher.initialize(latestL2Block)
    if (oProxyWorker !== null) {
      throw oProxyWorker
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestL2Block)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      throw monitorWithdrawalsInitResp.left
    }

    const l2Logs = await app.blockSrv.getL2Logs(l2BlocksDto)
    if (E.isLeft(l2Logs)) {
      throw new Error(l2Logs.left.name)
    }

    const bridgeEventFindings = app.bridgeWatcher.handleLogs(l2Logs.right)
    const govEventFindings = app.govWatcher.handleLogs(l2Logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleLogs(l2Logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(l2Logs.right, l2BlocksDto)

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
      app.bridgeBalanceSrv.handleBlock(l1BlockNumber, l2BlockNumbers),
    ])

    const findings: Finding[] = []
    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
      ...proxyWatcherFindings,
      ...oProxyWatcherFindings,
      ...bridgeBalanceFindings,
    )

    expect(findings.length).toEqual(0)
  }, 120_000)
})
