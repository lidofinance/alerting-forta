import { ethers, /*BlockEvent,*/ Finding, FindingSeverity, FindingType } from 'forta-agent'
import { strict as assert } from 'node:assert'
import * as process from 'process'
import * as grpc from '@grpc/grpc-js'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
// import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import { Initialize } from 'forta-agent/dist/sdk/handlers'
import * as E from 'fp-ts/Either'
import { JsonRpcProvider } from '@ethersproject/providers'
import { knex } from 'knex'
import BigNumber from 'bignumber.js'
import * as Winston from 'winston'
import { Logger } from 'winston'
import { BlockDto } from './entity/blockDto'
import { L2BlocksRepo } from './services/L2Blocks.repo'
import { L2BlocksSrv } from './services/L2Blocks.srv'
import { networkAlert } from './utils/error'

import { InitializeRequest, InitializeResponse, ResponseStatus, EvaluateBlockRequest, EvaluateBlockResponse, BlockEvent } from './generated/proto/agent_pb'

import { Finding as FindingProto } from './generated/proto/alert_pb'
import { AgentService } from './generated/proto/agent_grpc_pb'

import VERSION from './utils/version'
import { elapsedTime, elapsed } from './utils/time'
import { Config } from './utils/env'
import { L2Client } from './clients/l2_client'
import { EventWatcher } from './services/event_watcher_universal'
import { ERC20Short__factory } from './generated'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { DataRW } from './utils/mutex'
import { ETHProvider } from './clients/eth_provider_client'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { Constants, MAINNET_CHAIN_ID, DRPC_URL, L1_WSTETH_ADDRESS } from './constants'
import { getEventBasedAlerts } from './alert-bundles'

// import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'

const METADATA: { [key: string]: string } = {
  'version.commitHash': VERSION.commitHash,
  'version.commitMsg': VERSION.commitMsg,
}

const MINUTES_6 = 60 * 6


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


// export class App {
//   public static instance: App

//   public params: Constants
//   public l2Client: L2Client
//   public monitorWithdrawals: MonitorWithdrawals
//   public eventWatcher: EventWatcher
//   public bridgeBalanceSrv: BridgeBalanceSrv
//   public findingsRW: DataRW<Finding>
//   public logger: Logger
//   public provider: JsonRpcProvider
//   public isHandleBlockRunning: boolean = false

//   public constructor(params: Constants) {
//     this.params = params

//     this.logger = Winston.createLogger({
//       format: Winston.format.simple(),
//       transports: [new Winston.transports.Console()],
//     })

//     this.provider = new ethers.providers.JsonRpcProvider(params.L2_NETWORK_RPC, params.L2_NETWORK_ID)
//     const bridgedWstethRunner = ERC20Short__factory.connect(params.L2_WSTETH_BRIDGED.address, this.provider)

//     this.l2Client = new L2Client(this.provider, this.logger, bridgedWstethRunner, params.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)

    // const eventAlertsToWatch = getEventBasedAlerts(params.L2_NAME)
    // this.eventWatcher = new EventWatcher(eventAlertsToWatch, this.logger)

//     this.monitorWithdrawals = new MonitorWithdrawals(this.l2Client, this.logger, params)

//     const ethProvider = new ethers.providers.FallbackProvider([
//       new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), MAINNET_CHAIN_ID),
//       new ethers.providers.JsonRpcProvider(DRPC_URL, MAINNET_CHAIN_ID),
//     ])
//     const wstethRunner = ERC20Short__factory.connect(L1_WSTETH_ADDRESS, ethProvider)
//     const ethClient = new ETHProvider(this.logger, wstethRunner)
//     this.bridgeBalanceSrv = new BridgeBalanceSrv(params.L2_NAME, this.logger, ethClient, this.l2Client, params.L1_ERC20_TOKEN_GATEWAY_ADDRESS)

//     this.findingsRW = new DataRW<Finding>([])
//   }

//   public static createStaticInstance(params: Constants): Container {
//     if (App.instance) {
//       throw new Error(`App instance is already created`)
//     }
//     App.instance = new App(params)
//     return App.instance
//   }

//   public static async handleBlockStatic(blockEvent: BlockEvent): Promise<Finding[]> {
//     return await App.instance.handleBlock(blockEvent)
//   }

//   public async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
//         const startTime = new Date().getTime()
//     if (this.isHandleBlockRunning) {
//       return []
//     }

//     this.isHandleBlockRunning = true

//     const findings: Finding[] = []
//     const findingsAsync = await this.findingsRW.read()
//     if (findingsAsync.length > 0) {
//       findings.push(...findingsAsync)
//     }

//     const l2blocksDto = await this.l2Client.getNotYetProcessedL2Blocks()
//     if (E.isLeft(l2blocksDto)) {
//       this.isHandleBlockRunning = false
//       return [l2blocksDto.left]
//     }
//     this.logger.info(
//       `ETH block ${blockEvent.blockNumber.toString()}. Fetched ${this.params.L2_NAME} blocks from ${l2blocksDto.right[0].number} to ${
//         l2blocksDto.right[l2blocksDto.right.length - 1].number
//       }. Total: ${l2blocksDto.right.length}`,
//     )

//     const logs = await this.l2Client.getL2LogsOrNetworkAlert(l2blocksDto.right)
//     if (E.isLeft(logs)) {
//       this.isHandleBlockRunning = false
//       return [logs.left]
//     }

//     const eventBasedFindings = this.eventWatcher.handleLogs(logs.right)
//     const monitorWithdrawalsFindings = this.monitorWithdrawals.handleBlocks(logs.right, l2blocksDto.right)

//     const l2blockNumbersSet: Set<number> = new Set<number>()
//     for (const log of logs.right) {
//       l2blockNumbersSet.add(new BigNumber(log.blockNumber, 10).toNumber())
//     }

//     const l2blockNumbers = Array.from(l2blockNumbersSet)

//     const [bridgeBalanceFindings] = await Promise.all([
//       this.bridgeBalanceSrv.handleBlock(blockEvent.block.number, l2blockNumbers),
//     ])

//     findings.push(
//       ...eventBasedFindings,
//       ...bridgeBalanceFindings,
//       ...monitorWithdrawalsFindings,
//     )

//     this.logger.info(elapsedTime('handleBlock', startTime) + '\n')
//     this.isHandleBlockRunning = false
//     return findings
//   }

//   public static initializeStatic(params: Constants): Initialize {
//     if (!App.instance) {
//       App.createStaticInstance(params)
//     }

//     return async function (): Promise<InitializeResponse | void> {
//       await App.instance.initialize()
//     }
//   }

//   public async initialize() {
//     const latestL2Block = await this.l2Client.getLatestL2Block()
//     if (E.isLeft(latestL2Block)) {
//       this.logger.error(latestL2Block.left)

//       process.exit(1)
//     }

//     const monitorWithdrawalsInitResp = await this.monitorWithdrawals.initialize(latestL2Block.right.number)
//     if (E.isLeft(monitorWithdrawalsInitResp)) {
//       this.logger.error(monitorWithdrawalsInitResp.left)

//       process.exit(1)
//     }

//     METADATA[`${this.monitorWithdrawals.getName()}.currentWithdrawals`] =
//       monitorWithdrawalsInitResp.right.currentWithdrawals

//     const agents: string[] = [this.monitorWithdrawals.getName()]
//     METADATA.agents = '[' + agents.toString() + ']'

//     await this.findingsRW.write([
//       Finding.fromObject({
//         name: 'Agent launched',
//         description: `Version: ${VERSION.desc}`,
//         alertId: 'LIDO-AGENT-LAUNCHED',
//         severity: FindingSeverity.Info,
//         type: FindingType.Info,
//         metadata: METADATA,
//       }),
//     ])

//     this.logger.info('Bot initialization is done!')
//   }
// }


export class InitHandler {
  private readonly logger: Logger
  private readonly appName: string
  // private readonly withdrawSrv: WithdrawalSrv

  private readonly l1Client: ETHProvider
  private readonly l2Client: L2Client
  // private readonly l1ProxyWatcher: ProxyWatcher
  // private readonly l2ProxyWatchers: ProxyWatcher[]

  private onAppStartFindings: FindingProto[] = []

  constructor(
    appName: string,
    logger: Logger,
    onAppStartFindings: FindingProto[],
    // withdrawSrv: WithdrawalSrv,
    l1Client: ETHProvider,
    l2Client: L2Client,
    // l1ProxyWatcher: ProxyWatcher,
    // l2ProxyWatchers: ProxyWatcher[],
  ) {
    this.appName = appName
    this.logger = logger
    this.onAppStartFindings = onAppStartFindings
    // this.withdrawSrv = withdrawSrv
    this.l1Client = l1Client
    this.l2Client = l2Client
    // this.l1ProxyWatcher = l1ProxyWatcher
    // this.l2ProxyWatchers = l2ProxyWatchers
  }

  public handleInit() {
    return async (
      call: ServerUnaryCall<InitializeRequest, InitializeResponse>,
      callback: sendUnaryData<InitializeResponse>,
    ) => {
      const startTime = new Date().getTime()

      const f = new FindingProto()
      f.setName(`${this.appName} launched`)
      // f.setDescription(`Version: ${Version.desc}`)
      f.setAlertid('LIDO-AGENT-LAUNCHED')
      f.setSeverity(FindingProto.Severity.INFO)
      f.setType(FindingProto.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      // const m = f.getMetadataMap()
      // m.set('version.commitHash', Version.commitHash)
      // m.set('version.commitMsg', Version.commitMsg)

      const resp = new InitializeResponse()
      const [latestL1Block, latestL2BlockNumber] = await Promise.all([
        this.l1Client.getBlockByTag('latest'),
        this.l2Client.getLatestL2Block(),
      ])

      if (E.isLeft(latestL1Block)) {
        resp.setStatus(ResponseStatus.ERROR)
        this.logger.error(`Could not init. handleInit: ${latestL1Block.left.message}`)

        callback(null, resp)
        return
      }

      if (E.isLeft(latestL2BlockNumber)) {
        resp.setStatus(ResponseStatus.ERROR)
        this.logger.error(`Could not init. handleInit: ${latestL2BlockNumber.left.message}`)

        callback(null, resp)
        return
      }

      // const withdrawalsFindings = await this.withdrawSrv.initialize(latestL2BlockNumber.right.number)
      // if (E.isLeft(withdrawalsFindings)) {
      //   resp.setStatus(ResponseStatus.ERROR)
      //   this.logger.error(`Could not init. handleInit: ${withdrawalsFindings.left.message}`)

      //   callback(null, resp)
      //   return
      // }

      // this.onAppStartFindings.push(...withdrawalsFindings.right)

      // const promises = []

      // promises.push(this.l1ProxyWatcher.initialize(latestL1Block.right.number))

      // for (const l2ProxyWatcher of this.l2ProxyWatchers) {
        // promises.push(l2ProxyWatcher.initialize(latestL2BlockNumber.right.number))
      // }

      // const proxyErrors = (await Promise.all(promises)).flat()
      // if (proxyErrors.length > 0) {
      //   resp.setStatus(ResponseStatus.ERROR)
      //   this.logger.error(`Could not init. proxyWatchers`)

      //   callback(null, resp)
      //   return
      // }

      this.logger.info(elapsedTime(`${this.appName} started`, startTime) + '\n')

      this.onAppStartFindings.push(f)
      resp.setStatus(ResponseStatus.SUCCESS)

      callback(null, resp)
    }
  }
}


export class BlockHandler {
  private ethProvider: ETHProvider
  private logger: Logger
  // private metrics: Metrics
  private readonly l2BlocksSrv: L2BlocksSrv

  // private readonly l1ProxyWatcher: ProxyWatcher
  // private readonly l2ProxyWatchers: ProxyWatcher[]
  // private withdrawalsSrv: WithdrawalSrv
  // private bridgeBalanceSrv: BridgeBalanceSrv

  private l2EventWatcher: EventWatcher

  // private healthChecker: HealthChecker
  private onAppStartFindings: FindingProto[]
  private readonly networkName: string

  constructor(
    ethProvider: ETHProvider,
    logger: Logger,
    // metrics: Metrics,
    // l1ProxyWatcher: ProxyWatcher,
    // l2ProxyWatchers: ProxyWatcher[],
    // WithdrawalsSrv: WithdrawalSrv,
    // bridgeBalanceSrv: BridgeBalanceSrv,
    eventL2Watcher: EventWatcher,
    // healthChecker: HealthChecker,
    onAppStartFindings: FindingProto[],
    l2BlocksSrv: L2BlocksSrv,
    networkName: string,
  ) {
    this.ethProvider = ethProvider
    this.logger = logger
    // this.metrics = metrics
    this.l2BlocksSrv = l2BlocksSrv

    // this.l1ProxyWatcher = l1ProxyWatcher
    // this.l2ProxyWatchers = l2ProxyWatchers
    // this.withdrawalsSrv = WithdrawalsSrv
    // this.bridgeBalanceSrv = bridgeBalanceSrv

    this.l2EventWatcher = eventL2Watcher

    // this.healthChecker = healthChecker
    this.onAppStartFindings = onAppStartFindings
    this.networkName = networkName
  }

  public handleBlock() {
    return async (
      call: ServerUnaryCall<EvaluateBlockRequest, EvaluateBlockResponse>,
      callback: sendUnaryData<EvaluateBlockResponse>,
    ) => {
      const startTime = new Date()
      // this.metrics.lastAgentTouch.labels({ method: HandleL1BlockLabel }).set(startTime.getTime())
      // const end = this.metrics.summaryHandlers.labels({ method: HandleL1BlockLabel }).startTimer()

      const event = <BlockEvent>call.request.getEvent()
      const block = <BlockEvent.EthBlock>event.getBlock()
      const out = new EvaluateBlockResponse()

      const l1Block = new BlockDto(
        block.getHash(),
        block.getParenthash(),
        new BigNumber(block.getNumber(), 10).toNumber(),
        new BigNumber(block.getTimestamp(), 10).toNumber(),
      )

      const findings: FindingProto[] = []
      const latestL1Block = await this.ethProvider.getBlockByTag('latest')
      let startedMessage = `Handle block(${l1Block.number}). Latest: Could not fetched`
      if (E.isRight(latestL1Block)) {
        const infraLine = `#ETH block infra: ${l1Block.number} ${l1Block.timestamp}\n`
        const lastBlockLine = `#ETH block last: ${latestL1Block.right.number} ${latestL1Block.right.timestamp}. Delay between blocks: `
        const diff = latestL1Block.right.timestamp - l1Block.timestamp
        const diffLine = `${latestL1Block.right.timestamp} - ${l1Block.timestamp} = ${diff} seconds`

        startedMessage = `\n` + infraLine + lastBlockLine + diffLine

        if (diff > MINUTES_6) {
          const f = new FindingProto()

          f.setName(`⚠️ Currently processing Ethereum network block is outdated`)
          f.setDescription(infraLine + lastBlockLine + diffLine)
          f.setAlertid('L1-BLOCK-OUTDATED')
          f.setSeverity(FindingProto.Severity.MEDIUM)
          f.setType(FindingProto.FindingType.SUSPICIOUS)
          f.setProtocol('ethereum')

          findings.push(f)
        }
      }

      this.logger.info(startedMessage)

      const store = await this.l2BlocksSrv.updGetL2blocksStore(l1Block)
      if (E.isLeft(store)) {
        const networkErr = networkAlert(store.left, `Could not update l2 blocks store`, store.left.message)
        out.addFindings(networkErr)
        out.setStatus(ResponseStatus.ERROR)

        this.logger.error(`Could not handleBlock: ${store.left.message}`)
        // this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()
        // end()

        callback(null, out)
        return
      }

      if (this.onAppStartFindings.length > 0) {
        findings.push(...this.onAppStartFindings)
        this.onAppStartFindings = []
      }

      const l2EventFindings = this.l2EventWatcher.handleLogs(store.right.l2Logs)
      // const balancesFindings = await this.bridgeBalanceSrv.handleBlock(l1Block, store.right.l2Blocks)
      findings.push(/*...balancesFindings,*/ ...l2EventFindings)

      const l2Blocks = await this.l2BlocksSrv.getL2BlocksFrom(store.right.prevLatestL2Block)
      if (E.isLeft(l2Blocks)) {
        const msg = `Could not fetch l2 blocks from store from proxyWatcher`
        this.logger.error(`${msg}: ${l2Blocks.left.message}`)
        const networkErr = networkAlert(l2Blocks.left, msg, l2Blocks.left.message)
        findings.push(networkErr)
      }
      if (E.isRight(l2Blocks) && l2Blocks.right.length > 0) {
        // const promises = []
        // for (const proxyWatcher of this.l2ProxyWatchers) {
        //   promises.push(proxyWatcher.handleBlocks(store.right.l2Blocks))
        // }

        // const startProxyWatcher = new Date().getTime()
        // this.logger.info(
        //   `\tL2 Proxy watcher started: ${new Date(startProxyWatcher).toUTCString()}. L2Blocks: ${l2Blocks.right.length}`,
        // )
        // const proxyWatcherFindings = (await Promise.all(promises)).flat()
        // this.logger.info(`\tL2 Proxy watcher finished. Duration: ${elapsed(startProxyWatcher)}\n`)
        // findings.push(...proxyWatcherFindings)

        // const withdrawalFindings = await this.withdrawalsSrv.toMonitor(store.right.l2Logs, l2Blocks.right)
        // findings.push(...withdrawalFindings)
      }

      const startProxyWatcher = new Date().getTime()
      this.logger.info(
        `\n\tL1 Proxy watcher started: ${new Date(startProxyWatcher).toUTCString()}. L1Block: ${l1Block.number}`,
      )
      // const l1ProxyFindings = await this.l1ProxyWatcher.handleBlocks([l1Block])
      // this.logger.info(`\tL1 Proxy watcher finished. Duration: ${elapsed(startProxyWatcher)}\n`)
      // findings.push(...l1ProxyFindings)

      const handleBlock = `Finish: handleBlock(${l1Block.number}). L2 blocks:`
      const duration = `Duration: ${elapsed(startTime.getTime())}\n`
      if (E.isRight(l2Blocks) && l2Blocks.right.length > 0) {
        this.logger.info(
          `${handleBlock} ${l2Blocks.right[0].number} - ${l2Blocks.right[l2Blocks.right.length - 1].number} Cnt(${l2Blocks.right.length}). ${duration}`,
        )
        // this.metrics.processedIterations
          // .labels({ method: HandleL2BlockLabel, status: StatusOK })
          // .inc(l2Blocks.right.length)
      } else {
        this.logger.info(`${handleBlock} 0. ${duration}`)
        // this.metrics.processedIterations.labels({ method: HandleL2BlockLabel, status: StatusFail }).inc()
      }

      // const errCount = this.healthChecker.check(findings)
      // errCount === 0
      //   ? this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusOK }).inc()
      //   : this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()

      // this.metrics.lastBlockNumber.set(l1Block.number)

      out.setStatus(ResponseStatus.SUCCESS)
      out.setPrivate(false)
      out.setFindingsList(findings)

      callback(null, out)
    }
  }
}





export const commonMain = async (params: Constants) => {
  const config = new Config()
  const dbClient = knex(config.knexConfig)
  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const l2Provider = new ethers.providers.JsonRpcProvider(params.L2_NETWORK_RPC, params.L2_NETWORK_ID)
  const bridgedWstethRunner = ERC20Short__factory.connect(params.L2_WSTETH_BRIDGED.address, l2Provider)

  const ethProvider = config.useFortaProvider
    ? new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), config.chainId)
    : new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)

  // const ethProvider = new ethers.providers.FallbackProvider([
    // new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), MAINNET_CHAIN_ID),
    // new ethers.providers.JsonRpcProvider(DRPC_URL, MAINNET_CHAIN_ID),
  // ])
  const wstethRunner = ERC20Short__factory.connect(L1_WSTETH_ADDRESS, ethProvider)
  const l1Client = new ETHProvider(logger, wstethRunner, ethProvider)

  const eventAlertsToWatch = getEventBasedAlerts(params.L2_NAME)
  const l2EventWatcher = new EventWatcher(eventAlertsToWatch, logger)


  const l2Client = new L2Client(l2Provider, logger, bridgedWstethRunner, params.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)
  const L2BlockRepo = new L2BlocksRepo(dbClient)

  assert(String(params.govExecutor) === params.govExecutor)
  const l2BlocksSrv = new L2BlocksSrv(l2Client, L2BlockRepo, [
    params.govExecutor as unknown as string, // TODO: it might be TransparentProxyInfo
    params.L2_ERC20_TOKEN_GATEWAY.address,
    params.L2_WSTETH_BRIDGED.address,
  ])

  const onAppFindings: FindingProto[] = []

  const grpcServer = new grpc.Server()

  const initH = new InitHandler(
    config.appName,
    logger,
    onAppFindings,
    // withdrawalsSrv,
    l1Client,
    l2Client,
    // l1ProxyWatcher,
    // l2ProxyWatchers,
  )
  const blockH = new BlockHandler(
    l1Client,
    logger,
    // metrics,

    // l1ProxyWatcher,
    // l2ProxyWatchers,
    // withdrawalsSrv,
    // bridgeBalanceSrv,

    l2EventWatcher,

    // healthChecker,
    onAppFindings,

    l2BlocksSrv,
    config.networkName,
  )

  grpcServer.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    // evaluateTx: txH.handleTx(),

    // healthCheck: healthH.healthGrpc(),

    // not used, but required for grpc contract
    // evaluateAlert: alertH.handleAlert(),
  })


  grpcServer.bindAsync(`0.0.0.0:${config.grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      logger.error(err)

      process.exit(1)
    }
    logger.info(`${config.appName} is listening on ${port}`)
  })
}


