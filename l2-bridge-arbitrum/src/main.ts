import * as grpc from '@grpc/grpc-js'
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
import { L2Client } from './clients/l2_client'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { ProxyWatcher } from './services/proxy_watcher'
import { ProxyContractClient } from './clients/proxy_contract_client'
import process from 'process'
import { EventWatcher } from './services/event_watcher'
import { getL1BridgeEvents, getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getL1ProxyAdminEvents, getL2ProxyAdminEvents } from './utils/events/proxy_admin_events'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { ETHProvider } from './clients/eth_provider_client'
import { ethers } from 'ethers'
import { ArbERC20__factory, ERC20Bridged__factory, OssifiableProxy__factory } from './generated/typechain'
import { LRUCache } from 'lru-cache'
import BigNumber from 'bignumber.js'
import { knex } from 'knex'
import { L2BlocksRepo } from './services/l2_blocks/L2Blocks.repo'
import { L2BlocksSrv } from './services/l2_blocks/L2Blocks.srv'
import { WithdrawalSrv } from './services/monitor_withdrawals'
import { WithdrawalRepo } from './services/monitor_withdrawals.repo'
import { TxHandler } from './handlers/tx.handler'
import { getL1RouterEvents } from './utils/events/router_events'

const MINUTES_30 = 1000 * 60 * 30

const main = async () => {
  const config = new Config()
  const dbClient = knex(config.knexConfig)

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  try {
    await dbClient.migrate.latest()
    logger.info('Migrations have been run successfully.')
  } catch (error) {
    logger.error('Error running migrations:', error)
    process.exit(1)
  }

  const defaultRegistry = promClient
  defaultRegistry.collectDefaultMetrics({
    prefix: config.promPrefix,
  })

  const customRegister = new promClient.Registry()
  const mergedRegistry = promClient.Registry.merge([defaultRegistry.register, customRegister])
  mergedRegistry.setDefaultLabels({
    instance: config.instance,
    dataProvider: config.dataProvider,
    botName: config.promPrefix,
  })

  const metrics = new Metrics(mergedRegistry)

  const ethProvider = config.useFortaProvider
    ? new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), config.chainId)
    : new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)

  const l2NodeClient = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.arbChainID)

  const adr: Address = Address

  const onAppFindings: Finding[] = []
  const healthChecker = new HealthChecker(logger, metrics, BorderTime, MaxNumberErrorsPerBorderTime)

  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, l2NodeClient)
  const bridgedLdoRunner = ArbERC20__factory.connect(adr.ARBITRUM_LDO_BRIDGED_ADDRESS, l2NodeClient)

  const l2Client = new L2Client(l2NodeClient, metrics, bridgedWSthEthRunner, bridgedLdoRunner, logger)

  const L2BlockRepo = new L2BlocksRepo(dbClient)

  const l2BlocksSrv = new L2BlocksSrv(l2Client, L2BlockRepo, [
    adr.GOV_BRIDGE_ADDRESS,
    adr.ARBITRUM_L2_TOKEN_GATEWAY.address,
    adr.ARBITRUM_WSTETH_BRIDGED.address,
  ])

  const withdrawalRepo = new WithdrawalRepo(dbClient)

  const wSthEthRunner = ERC20Bridged__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
  const ldoRunner = ERC20Bridged__factory.connect(adr.L1_LDO_ADDRESS, ethProvider)

  const l1BlockCache = new LRUCache<string, BigNumber>({
    max: 600,
    ttl: MINUTES_30,
  })

  const l1Client = new ETHProvider(
    metrics,
    wSthEthRunner,
    ldoRunner,
    ethProvider,
    l1BlockCache,
    adr.ARBITRUM_L1_TOKEN_BRIDGE.address,
    adr.ARBITRUM_L1_LDO_BRIDGE,
    logger,
  )

  const withdrawalsSrv = new WithdrawalSrv(
    l1Client,
    l2Client,
    adr.ARBITRUM_L2_TOKEN_GATEWAY.address,
    logger,
    withdrawalRepo,
    config.networkName,
    adr.LIDO_STETH_ADDRESS,
  )

  const l1ProxyWatcher = new ProxyWatcher(
    new ProxyContractClient(
      adr.ARBITRUM_L1_TOKEN_BRIDGE.name,
      OssifiableProxy__factory.connect(adr.ARBITRUM_L1_TOKEN_BRIDGE.address, ethProvider),
      metrics,
    ),
    logger,
    config.networkName,
  )

  const l2ProxyWatchers: ProxyWatcher[] = [
    new ProxyWatcher(
      new ProxyContractClient(
        adr.ARBITRUM_WSTETH_BRIDGED.name,
        OssifiableProxy__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, l2NodeClient),
        metrics,
      ),
      logger,
      config.networkName,
    ),
    new ProxyWatcher(
      new ProxyContractClient(
        adr.ARBITRUM_L2_TOKEN_GATEWAY.name,
        OssifiableProxy__factory.connect(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, l2NodeClient),
        metrics,
      ),
      logger,
      config.networkName,
    ),
  ]

  const l1EventWatcher = new EventWatcher(
    `L1EventWatcher`,
    [
      ...getL1BridgeEvents(adr.ARBITRUM_L1_TOKEN_BRIDGE.address, adr.RolesMap, config.networkName),
      ...getL1ProxyAdminEvents(adr.ARBITRUM_L1_TOKEN_BRIDGE, config.networkName),
      ...getL1RouterEvents(adr.ARBITRUM_L1_GATEWAY_ROUTER, config.networkName),
    ],
    adr.L1_WSTETH_ADDRESS,
  )

  const l2EventWatcher = new EventWatcher(
    `L2EventWatcher`,
    [
      ...getL2BridgeEvents(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, adr.RolesMap, config.networkName),
      ...getL2ProxyAdminEvents(adr.ARBITRUM_WSTETH_BRIDGED, adr.ARBITRUM_L2_TOKEN_GATEWAY, config.networkName),
      ...getGovEvents(adr.GOV_BRIDGE_ADDRESS, config.networkName),
    ],
    adr.L1_WSTETH_ADDRESS,
  )

  const bridgeBalanceSrv = new BridgeBalanceSrv(logger, l1Client, l2Client, config.networkName, metrics)

  const grpcServer = new grpc.Server()

  const blockH = new BlockHandler(
    l1Client,
    logger,
    metrics,

    l1ProxyWatcher,
    l2ProxyWatchers,
    withdrawalsSrv,
    bridgeBalanceSrv,

    l2EventWatcher,

    healthChecker,
    onAppFindings,

    l2BlocksSrv,
    config.networkName,
  )

  const healthH = new HealthHandler(healthChecker, metrics, logger, config.ethereumRpcUrl, config.chainId)
  const initH = new InitHandler(
    config.appName,
    logger,
    onAppFindings,
    withdrawalsSrv,
    l1Client,
    l2Client,
    l1ProxyWatcher,
    l2ProxyWatchers,
  )
  const txH = new TxHandler(metrics, l1EventWatcher, withdrawalsSrv, bridgeBalanceSrv, config.networkName)

  grpcServer.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    evaluateTx: txH.handleTx(),
    healthCheck: healthH.healthGrpc(),
    // not used, but required for grpc contract
    // evaluateAlert: alertH.handleAlert(),
  })

  metrics.buildInfo.set({ commitHash: Version.commitHash }, 1)

  grpcServer.bindAsync(`0.0.0.0:${config.grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      logger.error(err)

      process.exit(1)
    }
    logger.info(`${config.appName} is listening on ${port}`)
  })

  const httpService: Express = express()

  httpService.get('/metrics', async (_: Request, res: Response) => {
    res.set('Content-Type', mergedRegistry.contentType)
    res.send(await mergedRegistry.metrics())
  })

  httpService.get('/health', healthH.healthHttp())

  httpService.listen(config.httpPort, () => {
    logger.info(`Http server is running at http://localhost:${config.httpPort}`)
  })
}

// @ts-ignore
main()
