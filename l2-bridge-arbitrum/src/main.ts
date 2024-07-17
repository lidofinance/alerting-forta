import * as grpc from '@grpc/grpc-js'
import { either as E } from 'fp-ts'
import { BlockHandler } from './handlers/block.handler'
import { HealthHandler } from './handlers/health.handler'
import { InitHandler } from './handlers/init.handler'
import { AgentService } from './generated/proto/agent_grpc_pb'
import express, { Express, Request, Response } from 'express'
import Version from './utils/version'
import { Finding } from './generated/proto/alert_pb'
import { Config } from './utils/env/env'
import * as Winston from 'winston'
import { Address } from './utils/constants'
import promClient from 'prom-client'
import { Metrics } from './utils/metrics/metrics'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { ArbitrumClient } from './clients/arbitrum_client'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { ProxyWatcher } from './services/proxy_watcher'
import { ProxyContractClient } from './clients/proxy_contract_client'
import process from 'process'
import { EventWatcher } from './services/event_watcher'
import { getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { ETHProvider } from './clients/eth_provider_client'
import { ethers } from 'ethers'
import {
  ArbERC20__factory,
  ERC20Bridged__factory,
  L2ERC20TokenGateway__factory,
  OssifiableProxy__factory,
} from './generated/typechain'
import { LRUCache } from 'lru-cache'
import { BlockDtoWithTransactions, BlockHash } from './entity/blockDto'
import BigNumber from 'bignumber.js'

const MINUTES_60 = 1000 * 60 * 60

const main = async () => {
  const config = new Config()

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const defaultRegistry = promClient
  defaultRegistry.collectDefaultMetrics({
    prefix: config.promPrefix,
  })

  const customRegister = new promClient.Registry()
  const mergedRegistry = promClient.Registry.merge([defaultRegistry.register, customRegister])
  mergedRegistry.setDefaultLabels({ instance: config.instance, dataProvider: config.dataProvider })

  const metrics = new Metrics(mergedRegistry, config.promPrefix)

  const ethProvider = config.useFortaProvider
    ? new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), config.chainId)
    : new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)

  const nodeClient = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.arbChainID)

  const adr: Address = Address

  const onAppFindings: Finding[] = []
  const healthChecker = new HealthChecker(logger, metrics, BorderTime, MaxNumberErrorsPerBorderTime)

  const l2Bridge = L2ERC20TokenGateway__factory.connect(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, nodeClient)
  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, nodeClient)
  const bridgedLdoRunner = ArbERC20__factory.connect(adr.ARBITRUM_LDO_BRIDGED_ADDRESS, nodeClient)

  const l2BlocksStore = new LRUCache<BlockHash, BlockDtoWithTransactions>({
    max: 30_000,
    ttl: MINUTES_60,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  })

  const l2BridgeCache = new LRUCache<BlockHash, BigNumber>({
    max: 30_000,
    ttl: MINUTES_60,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  })
  const arbitrumClient = new ArbitrumClient(
    nodeClient,
    metrics,
    l2Bridge,
    bridgedWSthEthRunner,
    bridgedLdoRunner,
    l2BlocksStore,
    l2BridgeCache,
  )
  const processedWithdrawalBlock = new LRUCache<number, boolean>({
    max: 30_000,
    ttl: MINUTES_60,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  })
  const withdrawalsSrv = new MonitorWithdrawals(
    arbitrumClient,
    adr.ARBITRUM_L2_TOKEN_GATEWAY.address,
    logger,
    processedWithdrawalBlock,
  )

  const proxyWatchers: ProxyWatcher[] = [
    new ProxyWatcher(
      new ProxyContractClient(
        adr.ARBITRUM_WSTETH_BRIDGED.name,
        OssifiableProxy__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, nodeClient),
        metrics,
      ),
      logger,
    ),
    new ProxyWatcher(
      new ProxyContractClient(
        adr.ARBITRUM_L2_TOKEN_GATEWAY.name,
        OssifiableProxy__factory.connect(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, nodeClient),
        metrics,
      ),
      logger,
    ),
  ]

  const bridgeEventWatcher = new EventWatcher(
    'BridgeEventWatcher',
    getL2BridgeEvents(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, adr.RolesMap),
  )
  const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.GOV_BRIDGE_ADDRESS))
  const proxyEventWatcher = new EventWatcher(
    'ProxyEventWatcher',
    getProxyAdminEvents(adr.ARBITRUM_WSTETH_BRIDGED, adr.ARBITRUM_L2_TOKEN_GATEWAY),
  )

  const wSthEthRunner = ERC20Bridged__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
  const ldoRunner = ERC20Bridged__factory.connect(adr.L1_LDO_ADDRESS, ethProvider)

  const l1BlockCache = new LRUCache<BlockHash, BigNumber>({
    max: 600,
    ttl: MINUTES_60,
  })
  const l1Client = new ETHProvider(
    metrics,
    wSthEthRunner,
    ldoRunner,
    ethProvider,
    l1BlockCache,
    adr.ARBITRUM_L1_TOKEN_BRIDGE,
    adr.ARBITRUM_L1_LDO_BRIDGE,
  )
  const processedKeyPairsCache = new LRUCache<string, boolean>({
    max: 30_000,
    ttl: MINUTES_60,
  })
  const bridgeBalanceSrv = new BridgeBalanceSrv(logger, l1Client, arbitrumClient, processedKeyPairsCache)

  const gRPCserver = new grpc.Server()

  const latestL2BlockNumber = await arbitrumClient.getLatestL2Block()
  if (E.isLeft(latestL2BlockNumber)) {
    logger.error(latestL2BlockNumber.left)

    process.exit(1)
  }

  const blockH = new BlockHandler(
    arbitrumClient,
    l1Client,
    logger,
    metrics,

    proxyWatchers,
    withdrawalsSrv,
    bridgeBalanceSrv,

    bridgeEventWatcher,
    govEventWatcher,
    proxyEventWatcher,

    healthChecker,
    onAppFindings,
  )

  const healthH = new HealthHandler(healthChecker, metrics, logger, config.ethereumRpcUrl, config.chainId)
  const initH = new InitHandler(config.appName, logger, onAppFindings)

  gRPCserver.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    // evaluateTx: txH.handleTx(),
    // healthCheck: healthH.healthGrpc(),
    // not used, but required for grpc contract
    // evaluateAlert: alertH.handleAlert(),
  })

  const withdrawalsSrvErr = await withdrawalsSrv.initialize(latestL2BlockNumber.right.number)
  if (E.isLeft(withdrawalsSrvErr)) {
    logger.error('Could not init withdrawalsSrvErr', withdrawalsSrvErr.left)

    process.exit(1)
  }

  for (const proxyWatcher of proxyWatchers) {
    const proxyWatcherErr = await proxyWatcher.initialize(latestL2BlockNumber.right.number)
    if (proxyWatcherErr !== null) {
      logger.error('Could not init proxyWatcherSrv', proxyWatcherErr.message)

      process.exit(1)
    }
  }

  metrics.buildInfo.set({ commitHash: Version.commitHash }, 1)

  gRPCserver.bindAsync(`0.0.0.0:${config.grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      logger.error(err)

      process.exit(1)
    }
    logger.info(`${config.appName} is listening on ${port}`)
  })

  const httpService: Express = express()

  httpService.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', mergedRegistry.contentType)
    res.send(await mergedRegistry.metrics())
  })

  httpService.get('/health', healthH.healthHttp())

  httpService.listen(config.httpPort, () => {
    logger.info(`Http server is running at http://localhost:${config.httpPort}`)
  })
}

main()
