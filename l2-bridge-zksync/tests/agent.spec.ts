import { App } from '../src/app'
import * as E from 'fp-ts/Either'
import { Finding } from 'forta-agent'
import { handleBlock, initialize } from '../src/agent'
import { etherBlockToFortaBlockEvent } from './utils'

describe('agent-zkSync e2e tests', () => {
  test('should process handleBlocks', async () => {
    const app = await App.getInstance()

    const latestBlock = 27_772_524

    const blocksDto = await app.zkSyncClient.fetchBlocks(27_772_500, latestBlock)

    const agentMeta = await app.oProxyWatcher.initialize(latestBlock)
    if (agentMeta !== null) {
      throw agentMeta
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestBlock)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      throw monitorWithdrawalsInitResp.left
    }

    const logs = await app.blockSrv.getLogs(blocksDto)
    if (E.isLeft(logs)) {
      throw logs.left
    }

    const blockNumbers: number[] = []
    for (const block of blocksDto) {
      blockNumbers.push(block.number)
    }

    const bridgeEventFindings = app.bridgeWatcher.handleLogs(logs.right)
    const govEventFindings = app.govWatcher.handleLogs(logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleLogs(logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(logs.right, blocksDto)
    const proxyWatcherFindings = await app.oProxyWatcher.handleBlocks(blockNumbers)

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

  test('should process app', async () => {
    const init = initialize()
    await init()

    const handleBlocks = handleBlock()
    const app = await App.getInstance()

    const latestBlock = 27_772_524

    const blocksDto = await app.zkSyncClient.fetchBlocks(27_772_500, latestBlock)
    const out: Finding[] = []
    for (const b of blocksDto) {
      const blockEvent = etherBlockToFortaBlockEvent(b)
      const findings = await handleBlocks(blockEvent)

      out.push(...findings)
    }

    expect(out.length).toEqual(1)
    expect(out[0].name).toEqual(`Agent launched`)
  }, 120_000)
})
