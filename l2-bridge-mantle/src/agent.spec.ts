import { App } from './app'
import * as E from 'fp-ts/Either'
import { Finding } from 'forta-agent'
import BigNumber from 'bignumber.js'

describe('agent-mantle functional test', () => {
  test('should process app on 62_394_250 and 62_394_300 (50 l2 blocks)', async () => {
    const app = await App.getInstance()

    const l1Block = 19_639_035
    const l2StartBlock = 62_394_250
    const l2EndBlock = 62_394_300
    const l2BlocksDto = await app.mantleClient.fetchL2Blocks(l2StartBlock, l2EndBlock)

    for (const proxyWatcher of app.proxyWatchers) {
      const err = await proxyWatcher.initialize(l2StartBlock)
      if (err !== null) {
        throw null
      }
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(l2StartBlock)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      throw monitorWithdrawalsInitResp.left
    }

    const l2logs = await app.blockSrv.getL2Logs(l2BlocksDto)
    if (E.isLeft(l2logs)) {
      throw l2logs.left
    }

    const l2BlockNumberSet: Set<number> = new Set<number>()
    for (const l2log of l2logs.right) {
      l2BlockNumberSet.add(new BigNumber(l2log.blockNumber, 10).toNumber())
    }

    const bridgeEventFindings = app.bridgeWatcher.handleL2Logs(l2logs.right)
    const govEventFindings = app.govWatcher.handleL2Logs(l2logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleL2Logs(l2logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleL2Blocks(l2logs.right, l2BlocksDto)
    const proxyWatcherFindings: Finding[] = []

    const l2BlockNumbers = Array.from(l2BlockNumberSet).toSorted((a, b) => a - b)

    for (const proxyWatcher of app.proxyWatchers) {
      const fnds = await proxyWatcher.handleL2Blocks(l2BlockNumbers)
      proxyWatcherFindings.push(...fnds)
    }

    const bridgeBalanceFindings = await app.bridgeBalanceSrv.handleBlock(l1Block, l2BlockNumbers)

    const findings: Finding[] = []
    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
      ...proxyWatcherFindings,
      ...bridgeBalanceFindings,
    )

    expect(findings.length).toEqual(0)
  }, 360_000)
})
