import { ethers, BlockEvent, Finding, FindingSeverity, FindingType, HandleBlock } from 'forta-agent'
import * as process from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import VERSION from '../../common/utils/version'
import { elapsedTime } from '../../common/utils/time'
import BigNumber from 'bignumber.js'

import { L2Client } from '../../common/clients/l2_client'
import { EventWatcher } from '../../common/services/event_watcher'
import { ERC20Short__factory } from '../../common/generated'
import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import { DataRW } from '../../common/utils/mutex'
import * as Winston from 'winston'
import { MAINNET_CHAIN_ID, DRPC_URL } from '../../common/utils/constants'
import { Constants, getBridgeEvents, getGovEvents, getProxyAdminEvents } from './constants'
import { Logger } from 'winston'
import { ETHProvider } from '../../common/clients/eth_provider_client'
import { BridgeBalanceSrv } from '../../common/services/bridge_balance'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
// import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'


export type Container = {
  l2Client: L2Client
  monitorWithdrawals: MonitorWithdrawals
  bridgeWatcher: EventWatcher
  bridgeBalanceSrv: BridgeBalanceSrv
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  findingsRW: DataRW<Finding>
  logger: Logger
  // healthChecker: HealthChecker
}

export class App {
  private static instance: Container

  private constructor() {}

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const nodeClient = new ethers.providers.JsonRpcProvider(Constants.L2_NETWORK_RPC, Constants.L2_NETWORK_ID)
      const bridgedWstethRunner = ERC20Short__factory.connect(Constants.L2_WSTETH_BRIDGED.address, nodeClient)

      const l2Client = new L2Client(nodeClient, logger, bridgedWstethRunner, Constants.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getBridgeEvents(Constants.L2_ERC20_TOKEN_GATEWAY.address, Constants.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(Constants.GOV_BRIDGE_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(Constants.L2_WSTETH_BRIDGED, Constants.L2_ERC20_TOKEN_GATEWAY),
        logger,
      )

      const monitorWithdrawals = new MonitorWithdrawals(
        l2Client, Constants.L2_ERC20_TOKEN_GATEWAY.address, logger, Constants.withdrawalInfo,
        Constants.SCROLL_APPROX_BLOCK_TIME_3_SECONDS
      )

      const ethProvider = new ethers.providers.FallbackProvider([
        new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), MAINNET_CHAIN_ID),
        new ethers.providers.JsonRpcProvider(DRPC_URL, MAINNET_CHAIN_ID),
      ])

      const wstethRunner = ERC20Short__factory.connect(Constants.L1_WSTETH_ADDRESS, ethProvider)
      const ethClient = new ETHProvider(logger, wstethRunner)
      const bridgeBalanceSrv = new BridgeBalanceSrv(Constants.L2_NAME, logger, ethClient, l2Client, Constants.L1_ERC20_TOKEN_GATEWAY_ADDRESS)

      App.instance = {
        l2Client: l2Client,
        monitorWithdrawals: monitorWithdrawals,
        bridgeWatcher: bridgeEventWatcher,
        bridgeBalanceSrv: bridgeBalanceSrv,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        findingsRW: new DataRW<Finding>([]),
        logger: logger,
        // healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}


export function initialize(): Initialize {
  type Metadata = { [key: string]: string }

  const metadata: Metadata = {
    'version.commitHash': VERSION.commitHash,
    'version.commitMsg': VERSION.commitMsg,
  }

  return async function (): Promise<InitializeResponse | void> {
    const app = await App.getInstance()

    const latestL2Block = await app.l2Client.getLatestL2Block()
    if (E.isLeft(latestL2Block)) {
      app.logger.error(latestL2Block.left)

      process.exit(1)
    }

    const monitorWithdrawalsInitResp = await app.monitorWithdrawals.initialize(latestL2Block.right.number)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      app.logger.error(monitorWithdrawalsInitResp.left)

      process.exit(1)
    }

    metadata[`${app.monitorWithdrawals.getName()}.currentWithdrawals`] =
      monitorWithdrawalsInitResp.right.currentWithdrawals

    const agents: string[] = [app.monitorWithdrawals.getName()]
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

let isHandleBlockRunning: boolean = false
export const handleBlock = (): HandleBlock => {
  return async function (blockEvent: BlockEvent): Promise<Finding[]> {
    const startTime = new Date().getTime()
    if (isHandleBlockRunning) {
      return []
    }

    isHandleBlockRunning = true
    const app = await App.getInstance()

    const findings: Finding[] = []
    const findingsAsync = await app.findingsRW.read()
    if (findingsAsync.length > 0) {
      findings.push(...findingsAsync)
    }

    const l2blocksDto = await app.l2Client.getNotYetProcessedL2Blocks()
    if (E.isLeft(l2blocksDto)) {
      isHandleBlockRunning = false
      return [l2blocksDto.left]
    }
    app.logger.info(
      `ETH block ${blockEvent.blockNumber.toString()}. Fetched ${Constants.L2_NAME} blocks from ${l2blocksDto.right[0].number} to ${
        l2blocksDto.right[l2blocksDto.right.length - 1].number
      }. Total: ${l2blocksDto.right.length}`,
    )

    const logs = await app.l2Client.getL2LogsOrNetworkAlert(l2blocksDto.right)
    if (E.isLeft(logs)) {
      isHandleBlockRunning = false
      return [logs.left]
    }

    const bridgeEventFindings = app.bridgeWatcher.handleLogs(logs.right)
    const govEventFindings = app.govWatcher.handleLogs(logs.right)
    const proxyAdminEventFindings = app.proxyEventWatcher.handleLogs(logs.right)
    const monitorWithdrawalsFindings = app.monitorWithdrawals.handleBlocks(logs.right, l2blocksDto.right)

    const l2blockNumbersSet: Set<number> = new Set<number>()
    for (const log of logs.right) {
      l2blockNumbersSet.add(new BigNumber(log.blockNumber, 10).toNumber())
    }

    const l2blockNumbers = Array.from(l2blockNumbersSet)

    const [bridgeBalanceFindings] = await Promise.all([
      app.bridgeBalanceSrv.handleBlock(blockEvent.block.number, l2blockNumbers),
    ])

    findings.push(
      ...bridgeEventFindings,
      ...bridgeBalanceFindings,
      ...govEventFindings,
      ...proxyAdminEventFindings,
      ...monitorWithdrawalsFindings,
    )

    app.logger.info(elapsedTime('handleBlock', startTime) + '\n')
    isHandleBlockRunning = false
    return findings
  }
}

export default {
  initialize: initialize(),
  handleBlock: handleBlock(),
}