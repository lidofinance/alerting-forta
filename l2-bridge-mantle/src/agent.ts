import { BlockEvent, Finding, FindingSeverity, FindingType, HandleBlock } from 'forta-agent'
import * as process from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import VERSION from './utils/version'
import { App } from './app'
import { elapsedTime } from './utils/time'

export function initialize(): Initialize {
  type Metadata = { [key: string]: string }

  const metadata: Metadata = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const app = await App.getInstance()

    const latestBlock = await app.mantleClient.getLatestBlock()
    if (E.isLeft(latestBlock)) {
      app.logger.error(latestBlock.left)

      process.exit(1)
    }

    const agentMeta = await app.proxyWatcher.initialize(latestBlock.right.number)
    if (E.isLeft(agentMeta)) {
      app.logger.error(agentMeta.left)

      process.exit(1)
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestBlock.right.number)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      app.logger.error(monitorWithdrawalsInitResp.left)

      process.exit(1)
    }

    metadata[`${app.proxyWatcher.getName()}.lastAdmins`] = agentMeta.right.lastAdmins
    metadata[`${app.proxyWatcher.getName()}.lastImpls`] = agentMeta.right.lastImpls
    metadata[`${app.monitorWithdrawals.getName()}.currentWithdrawals`] =
      monitorWithdrawalsInitResp.right.currentWithdrawals

    const agents: string[] = [app.proxyWatcher.getName(), app.monitorWithdrawals.getName()]
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
      `ETH block ${blockEvent.blockNumber.toString()}. Fetched mantle blocks from ${blocksDto.right[0].number} to ${
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

    const blockNumbers: number[] = []
    for (const log of logs.right) {
      blockNumbers.push(log.blockNumber)
    }

    app.proxyWatcher.handleBlocks(blockNumbers).then((findings: Finding[]) => {
      if (findings.length > 0) {
        app.findingsRW.write(findings)
      }
    })

    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
    )

    app.logger.info(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBLockRunning = false
    return findings
  }
}

export default {
  initialize: initialize(),
  handleBlock: handleBlock(),
}
