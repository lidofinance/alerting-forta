import { ethers, BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'

import * as process from 'process'
import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import VERSION from './utils/version'
import { elapsedTime } from './utils/time'
import BigNumber from 'bignumber.js'
import { JsonRpcProvider } from '@ethersproject/providers'

import { L2Client } from './clients/l2_client'
import { EventWatcher } from './services/event_watcher_universal'
import { ERC20Short__factory } from './generated'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import { Logger } from 'winston'
import { ETHProvider } from './clients/eth_provider_client'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import { Constants, MAINNET_CHAIN_ID, DRPC_URL, L1_WSTETH_ADDRESS } from './constants'
import { getEventBasedAlerts } from './alert-bundles'

// import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'

const METADATA: { [key: string]: string } = {
  'version.commitHash': VERSION.commitHash,
  'version.commitMsg': VERSION.commitMsg,
}


export type Container = {
  params: Constants,
  l2Client: L2Client
  monitorWithdrawals: MonitorWithdrawals
  eventWatcher: EventWatcher
  bridgeBalanceSrv: BridgeBalanceSrv
  findingsRW: DataRW<Finding>
  logger: Logger
  provider: JsonRpcProvider,
  // healthChecker: HealthChecker
}


export class App {
  public static instance: App

  public params: Constants
  public l2Client: L2Client
  public monitorWithdrawals: MonitorWithdrawals
  public eventWatcher: EventWatcher
  public bridgeBalanceSrv: BridgeBalanceSrv
  public findingsRW: DataRW<Finding>
  public logger: Logger
  public provider: JsonRpcProvider
  public isHandleBlockRunning: boolean = false

  public constructor(params: Constants) {
    this.params = params

    this.logger = Winston.createLogger({
      format: Winston.format.simple(),
      transports: [new Winston.transports.Console()],
    })

    this.provider = new ethers.providers.JsonRpcProvider(params.L2_NETWORK_RPC, params.L2_NETWORK_ID)
    const bridgedWstethRunner = ERC20Short__factory.connect(params.L2_WSTETH_BRIDGED.address, this.provider)

    this.l2Client = new L2Client(this.provider, this.logger, bridgedWstethRunner, params.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)

    const eventAlertsToWatch = getEventBasedAlerts(params.L2_NAME)
    this.eventWatcher = new EventWatcher(eventAlertsToWatch, this.logger)

    this.monitorWithdrawals = new MonitorWithdrawals(this.l2Client, this.logger, params)

    const ethProvider = new ethers.providers.FallbackProvider([
      new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), MAINNET_CHAIN_ID),
      new ethers.providers.JsonRpcProvider(DRPC_URL, MAINNET_CHAIN_ID),
    ])

    const wstethRunner = ERC20Short__factory.connect(L1_WSTETH_ADDRESS, ethProvider)
    const ethClient = new ETHProvider(this.logger, wstethRunner)
    this.bridgeBalanceSrv = new BridgeBalanceSrv(params.L2_NAME, this.logger, ethClient, this.l2Client, params.L1_ERC20_TOKEN_GATEWAY_ADDRESS)

    this.findingsRW = new DataRW<Finding>([])
  }

  public static createStaticInstance(params: Constants): Container {
    if (App.instance) {
      throw new Error(`App instance is already created`)
    }
    App.instance = new App(params)
    return App.instance
  }

  public static async handleBlockStatic(blockEvent: BlockEvent): Promise<Finding[]> {
    return await App.instance.handleBlock(blockEvent)
  }

  public async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
        const startTime = new Date().getTime()
    if (this.isHandleBlockRunning) {
      return []
    }

    this.isHandleBlockRunning = true

    const findings: Finding[] = []
    const findingsAsync = await this.findingsRW.read()
    if (findingsAsync.length > 0) {
      findings.push(...findingsAsync)
    }

    const l2blocksDto = await this.l2Client.getNotYetProcessedL2Blocks()
    if (E.isLeft(l2blocksDto)) {
      this.isHandleBlockRunning = false
      return [l2blocksDto.left]
    }
    this.logger.info(
      `ETH block ${blockEvent.blockNumber.toString()}. Fetched ${this.params.L2_NAME} blocks from ${l2blocksDto.right[0].number} to ${
        l2blocksDto.right[l2blocksDto.right.length - 1].number
      }. Total: ${l2blocksDto.right.length}`,
    )

    const logs = await this.l2Client.getL2LogsOrNetworkAlert(l2blocksDto.right)
    if (E.isLeft(logs)) {
      this.isHandleBlockRunning = false
      return [logs.left]
    }

    const eventBasedFindings = this.eventWatcher.handleLogs(logs.right)
    const monitorWithdrawalsFindings = this.monitorWithdrawals.handleBlocks(logs.right, l2blocksDto.right)

    const l2blockNumbersSet: Set<number> = new Set<number>()
    for (const log of logs.right) {
      l2blockNumbersSet.add(new BigNumber(log.blockNumber, 10).toNumber())
    }

    const l2blockNumbers = Array.from(l2blockNumbersSet)

    const [bridgeBalanceFindings] = await Promise.all([
      this.bridgeBalanceSrv.handleBlock(blockEvent.block.number, l2blockNumbers),
    ])

    findings.push(
      ...eventBasedFindings,
      ...bridgeBalanceFindings,
      ...monitorWithdrawalsFindings,
    )

    this.logger.info(elapsedTime('handleBlock', startTime) + '\n')
    this.isHandleBlockRunning = false
    return findings
  }

  public static initializeStatic(params: Constants): Initialize {
    if (!App.instance) {
      App.createStaticInstance(params)
    }

    return async function (): Promise<InitializeResponse | void> {
      await App.instance.initialize()
    }
  }

  public async initialize() {
    const latestL2Block = await this.l2Client.getLatestL2Block()
    if (E.isLeft(latestL2Block)) {
      this.logger.error(latestL2Block.left)

      process.exit(1)
    }

    const monitorWithdrawalsInitResp = await this.monitorWithdrawals.initialize(latestL2Block.right.number)
    if (E.isLeft(monitorWithdrawalsInitResp)) {
      this.logger.error(monitorWithdrawalsInitResp.left)

      process.exit(1)
    }

    METADATA[`${this.monitorWithdrawals.getName()}.currentWithdrawals`] =
      monitorWithdrawalsInitResp.right.currentWithdrawals

    const agents: string[] = [this.monitorWithdrawals.getName()]
    METADATA.agents = '[' + agents.toString() + ']'

    await this.findingsRW.write([
      Finding.fromObject({
        name: 'Agent launched',
        description: `Version: ${VERSION.desc}`,
        alertId: 'LIDO-AGENT-LAUNCHED',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: METADATA,
      }),
    ])

    this.logger.info('Bot initialization is done!')
  }
}
