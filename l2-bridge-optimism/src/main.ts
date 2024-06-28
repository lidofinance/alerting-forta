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
import { getEthersProvider } from 'forta-agent/dist/sdk/utils'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { OptimismClient } from './clients/optimism_client'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { TxHandler } from './handlers/tx.handler'
import { ProxyWatcher } from './services/proxy_watcher'
import { ProxyContractClient } from './clients/proxy_contract_client'
import process from 'process'
import { EventWatcher } from './services/event_watcher'
import { getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { AlertHandler } from './handlers/alert.handler'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { ETHProvider } from './clients/eth_provider_client'
import { ethers } from 'forta-agent'
import { ERC20Bridged__factory, L2ERC20TokenBridge__factory, OssifiableProxy__factory } from './generated/typechain'

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

  const optimismProvider = new ethers.providers.JsonRpcProvider(config.optimismRpcUrl, config.chainId)
  let nodeClient = getEthersProvider()
  if (!config.useFortaProvider) {
    nodeClient = optimismProvider
  }

  const adr: Address = Address

  const onAppFindings: Finding[] = []
  const healthChecker = new HealthChecker(logger, metrics, BorderTime, MaxNumberErrorsPerBorderTime)

  const l2Bridge = L2ERC20TokenBridge__factory.connect(adr.OPTIMISM_L2_TOKEN_GATEWAY.address, nodeClient)
  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.OPTIMISM_WSTETH_BRIDGED.address, nodeClient)
  const bridgedLdoRunner = ERC20Bridged__factory.connect(adr.OPTIMISM_LDO_BRIDGED_ADDRESS, nodeClient)

  const optimismClient = new OptimismClient(nodeClient, metrics, l2Bridge, bridgedWSthEthRunner, bridgedLdoRunner)
  const withdrawalsSrv = new MonitorWithdrawals(optimismClient, adr.OPTIMISM_L2_TOKEN_GATEWAY.address, logger)

  const proxyWatchers: ProxyWatcher[] = [
    new ProxyWatcher(
      new ProxyContractClient(
        adr.OPTIMISM_WSTETH_BRIDGED.name,
        OssifiableProxy__factory.connect(adr.OPTIMISM_WSTETH_BRIDGED.address, nodeClient),
        metrics,
      ),
      logger,
    ),
    new ProxyWatcher(
      new ProxyContractClient(
        adr.OPTIMISM_L2_TOKEN_GATEWAY.name,
        OssifiableProxy__factory.connect(adr.OPTIMISM_L2_TOKEN_GATEWAY.address, nodeClient),
        metrics,
      ),
      logger,
    ),
  ]

  const bridgeEventWatcher = new EventWatcher(
    'BridgeEventWatcher',
    getL2BridgeEvents(adr.OPTIMISM_L2_TOKEN_GATEWAY.address, adr.RolesMap),
  )
  const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.GOV_BRIDGE_ADDRESS))
  const proxyEventWatcher = new EventWatcher(
    'ProxyEventWatcher',
    getProxyAdminEvents(adr.OPTIMISM_WSTETH_BRIDGED, adr.OPTIMISM_L2_TOKEN_GATEWAY),
  )

  const mainnet = 1
  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, mainnet)

  const wSthEthRunner = ERC20Bridged__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
  const ldoRunner = ERC20Bridged__factory.connect(adr.L1_LDO_ADDRESS, ethProvider)

  const l1Client = new ETHProvider(metrics, wSthEthRunner, ldoRunner, ethProvider)
  const bridgeBalanceSrv = new BridgeBalanceSrv(
    logger,
    l1Client,
    adr.OPTIMISM_L1_TOKEN_BRIDGE,
    adr.OPTIMISM_L1_LDO_BRIDGE,
    optimismClient,
  )

  const gRPCserver = new grpc.Server()
  const blockH = new BlockHandler(
    logger,
    metrics,
    proxyWatchers,
    withdrawalsSrv,
    bridgeBalanceSrv,
    healthChecker,
    l1Client,
    onAppFindings,
  )

  const txH = new TxHandler(
    metrics,
    bridgeEventWatcher,
    govEventWatcher,
    proxyEventWatcher,
    withdrawalsSrv,
    healthChecker,
  )
  const healthH = new HealthHandler(healthChecker, metrics, logger, config.ethereumRpcUrl, config.chainId)
  const initH = new InitHandler(config.appName, logger, onAppFindings)
  const alertH = new AlertHandler()

  gRPCserver.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    evaluateTx: txH.handleTx(),
    healthCheck: healthH.healthGrpc(),
    // not used, but required for grpc contract
    evaluateAlert: alertH.handleAlert(),
  })

  const latestL2BlockNumber = await optimismClient.getBlockNumber()
  if (E.isLeft(latestL2BlockNumber)) {
    logger.error(latestL2BlockNumber.left)

    process.exit(1)
  }

  const withdrawalsSrvErr = await withdrawalsSrv.initialize(latestL2BlockNumber.right)
  if (E.isLeft(withdrawalsSrvErr)) {
    logger.error('Could not init withdrawalsSrvErr', withdrawalsSrvErr.left)

    process.exit(1)
  }

  for (const proxyWatcher of proxyWatchers) {
    const proxyWatcherErr = await proxyWatcher.initialize(latestL2BlockNumber.right)
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
