import { App } from './app'
import * as E from 'fp-ts/Either'
import { Finding } from 'forta-agent'

describe('agent-linea e2e tests', () => {
  test('should process handleBlocks', async () => {
    const app = await App.getInstance()

    const blocksDto = await app.LineaClient.fetchBlocks(5348550, 5348560)

    const agentMeta = await app.proxyWatcher.initialize(5348560)
    if (E.isLeft(agentMeta)) {
      throw agentMeta
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(5348560)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      throw monitorWithdrawalsInitResp
    }

    const logs = await app.blockSrv.getL2Logs(blocksDto)
    if (E.isLeft(logs)) {
      throw logs
    }

    const blockNumbers: number[] = []
    for (const block of blocksDto) {
      blockNumbers.push(block.number)
    }

    const bridgeEventFindings = app.bridgeWatcher.handleL2Logs(logs.right)
    const govEventFindings = app.govWatcher.handleL2Logs(logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleL2Logs(logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(logs.right, blocksDto)
    const proxyWatcherFindings = await app.proxyWatcher.handleBlocks(blockNumbers)

    const findings: Finding[] = []
    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
      ...proxyWatcherFindings,
    )

    expect(findings.length).toEqual(0)
  }, 120_000)
})
