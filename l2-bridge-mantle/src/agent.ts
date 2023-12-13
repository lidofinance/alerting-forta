import { BlockEvent, Finding, FindingSeverity, FindingType, HandleBlock } from 'forta-agent'
import * as process from 'process'
import { argv } from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import { Metadata } from './entity/metadata'
import * as E from 'fp-ts/Either'
import VERSION from './utils/version'
import { App } from './app'

export function initialize(outFinding: Finding[]): Initialize {
  const metadata: Metadata = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const app = await App.getInstance()

    const latestBlockNumber = await app.mantleClient.getStartedBlockForApp(argv)
    if (E.isLeft(latestBlockNumber)) {
      console.log(`Error: ${latestBlockNumber.left.message}`)
      console.log(`Stack: ${latestBlockNumber.left.stack}`)

      process.exit(1)
    }

    const agentMeta = await app.proxyWatcher.initialize(latestBlockNumber.right)
    if (E.isLeft(agentMeta)) {
      console.log(`Error: ${agentMeta.left.message}`)
      console.log(`Stack: ${agentMeta.left.stack}`)

      process.exit(1)
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestBlockNumber.right)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      console.log(`Error: ${monitorWithdrawalsInitResp.left.message}`)
      console.log(`Stack: ${monitorWithdrawalsInitResp.left.stack}`)

      process.exit(1)
    }

    metadata[`${app.proxyWatcher.getName()}.lastAdmins`] = agentMeta.right.lastAdmins
    metadata[`${app.proxyWatcher.getName()}.lastImpls`] = agentMeta.right.lastImpls
    metadata[`${app.monitorWithdrawals.getName()}.currentWithdrawals`] =
      monitorWithdrawalsInitResp.right.currentWithdrawals

    const agents: string[] = [app.proxyWatcher.getName(), app.monitorWithdrawals.getName()]
    metadata.agents = '[' + agents.toString() + ']'

    outFinding.push(
      Finding.fromObject({
        name: 'Agent launched',
        description: `Version: ${VERSION.desc}`,
        alertId: 'LIDO-AGENT-LAUNCHED',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata,
      }),
    )

    console.log('Bot initialization is done!')
  }
}

export const handleBlock = (initFinding: Finding[]): HandleBlock => {
  return async function (blockEvent: BlockEvent): Promise<Finding[]> {
    const app = await App.getInstance()

    const findings: Finding[] = []

    if (initFinding.length) {
      findings.push(...initFinding)
      initFinding = []
    }

    const blocksDto = await app.blockSrv.getBlocks()
    if (E.isLeft(blocksDto)) {
      return [blocksDto.left]
    }
    console.log(
      `#ETH block ${blockEvent.blockNumber.toString()}. Fetching mantle blocks from ${blocksDto.right[0].number} to ${
        blocksDto.right[blocksDto.right.length - 1].number
      }. Total: ${blocksDto.right[blocksDto.right.length - 1].number - blocksDto.right[0].number}`,
    )

    const logs = await app.blockSrv.getLogs(blocksDto.right)
    if (E.isLeft(logs)) {
      return [logs.left]
    }

    const bridgeEventFindings = app.bridgeWatcher.handleLogs(logs.right)
    const govEventFindings = app.govWatcher.handleLogs(logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleLogs(logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(blocksDto.right)

    const blockNumbers: number[] = []
    for (const log of logs.right) {
      blockNumbers.push(log.blockNumber)
    }
    const proxyWatcherFindings = await app.proxyWatcher.handleBlocks(blockNumbers)

    app.monitorWithdrawals.handleWithdrawalEvent(logs.right, blocksDto.right)

    findings.push(
      ...bridgeEventFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...proxyWatcherFindings,
      ...monitorWithdrawalsFindings,
    )

    return findings
  }
}

const initFinding: Finding[] = []

export default {
  initialize: initialize(initFinding),
  handleBlock: handleBlock(initFinding),
}
