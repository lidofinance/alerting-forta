import { App } from './app'
import * as E from 'fp-ts/Either'
import { Finding } from 'forta-agent'
import { ethers } from 'ethers'
import BigNumber from 'bignumber.js'

describe('agent-base functional test', () => {
  test('should process app on latest 25 l2 blocks', async () => {
    const l1rpcURL = 'https://eth.drpc.org'
    const app = App.getInstance()

    const ehtProvider = new ethers.providers.JsonRpcProvider(l1rpcURL)
    const l1Block = await ehtProvider.getBlockNumber()

    const l2EndBlock = await app.baseClient.getLatestL2Block()
    if (E.isLeft(l2EndBlock)) {
      throw l2EndBlock
    }

    const l2StartBlock = l2EndBlock.right.number - 25
    const l2BlocksDto = await app.baseClient.fetchL2Blocks(l2StartBlock, l2EndBlock.right.number)

    for (const proxyWatcher of app.proxyWatchers) {
      const err = await proxyWatcher.initialize(l2StartBlock)
      if (err !== null) {
        throw err
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

    const bridgeBalanceFindings = await app.bridgeBalanceSrc.handleBlock(l1Block, l2BlockNumbers)

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
