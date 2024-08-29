import * as grpc from '@grpc/grpc-js'
import { either as E } from 'fp-ts'
import { BlockHandler } from './handlers/block.handler'
import { HealthHandler } from './handlers/health.handler'
import { TxHandler } from './handlers/tx.handler'
import { InitHandler } from './handlers/init.handler'
import { AlertHandler } from './handlers/alert.handler'
import { AgentService } from './generated/proto/agent_grpc_pb'
import { Express, Request, Response } from 'express'
import Version from './utils/version'
import { Finding } from './generated/proto/alert_pb'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from './generated/typechain'
import { Config } from './utils/env/env'
import * as Winston from 'winston'
import { ethers } from 'ethers'
import { ETHProvider } from './clients/eth_provider'
import { getCSFeeDistributorEvents } from './utils/events/cs_fee_distributor_events'
import { getCSFeeOracleEvents, getHashConsensusEvents } from './utils/events/cs_fee_oracle_events'
import { getOssifiedProxyEvents } from './utils/events/ossified_proxy_events'
import { getPausableEvents } from './utils/events/pausable_events'
import { getCSAccountingEvents } from './utils/events/cs_accounting_events'
import { getAssetRecovererEvents } from './utils/events/asset_recoverer_events'
import * as promClient from 'prom-client'
import { Metrics } from './utils/metrics/metrics'
import { CSModuleSrv } from './services/CSModule/CSModule.srv'
import { CSFeeDistributorSrv } from './services/CSFeeDistributor/CSFeeDistributor.srv'
import { CSAccountingSrv } from './services/CSAccounting/CSAccounting.srv'
import { CSFeeOracleSrv } from './services/CSFeeOracle/CSFeeOracle.srv'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import express = require('express')
import { ProxyWatcherSrv } from './services/ProxyWatcher/ProxyWatcher.srv'
import {
  CONTRACTS_WITH_ASSET_RECOVERER,
  CSM_PROXY_CONTRACTS,
  PAUSABLE_CONTRACTS,
  DeploymentAddresses,
} from './utils/constants.mainnet'
import {
  CONTRACTS_WITH_ASSET_RECOVERER as HOLESKY_CONTRACTS_WITH_ASSET_RECOVERER,
  CSM_PROXY_CONTRACTS as HOLESKY_CSM_PROXY_CONTRACTS,
  PAUSABLE_CONTRACTS as HOLESKY_PAUSABLE_CONTRACTS,
  DeploymentAddresses as HoleskyDeploymentAddresses,
} from './utils/constants.holesky'

const loadDeploymentData = (chainId: number) => {
  switch (chainId) {
    case 1:
      return {
        deploymentAddresses: DeploymentAddresses,
        contractsWithAssetRecoverer: CONTRACTS_WITH_ASSET_RECOVERER,
        csmProxyContracts: CSM_PROXY_CONTRACTS,
        pausableContracts: PAUSABLE_CONTRACTS,
      }
    case 17000:
      return {
        deploymentAddresses: HoleskyDeploymentAddresses,
        contractsWithAssetRecoverer: HOLESKY_CONTRACTS_WITH_ASSET_RECOVERER,
        csmProxyContracts: HOLESKY_CSM_PROXY_CONTRACTS,
        pausableContracts: HOLESKY_PAUSABLE_CONTRACTS,
      }
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`)
  }
}

const main = async () => {
  const config = new Config()
  if (config.dataProvider === '') {
    console.log('Could not set up dataProvider')
    process.exit(1)
  }

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

  const ethProvider = new ethers.JsonRpcProvider(config.ethereumRpcUrl)

  const { deploymentAddresses, contractsWithAssetRecoverer, csmProxyContracts, pausableContracts } = loadDeploymentData(
    config.chainId,
  )

  const address = deploymentAddresses

  const etherscanProvider = new ethers.EtherscanProvider(await ethProvider._detectNetwork(), config.etherscanKey)

  const csModuleRunner = CSModule__factory.connect(address.CS_MODULE_ADDRESS, ethProvider)
  const csAccountingRunner = CSAccounting__factory.connect(address.CS_ACCOUNTING_ADDRESS, ethProvider)
  const csFeeDistributorRunner = CSFeeDistributor__factory.connect(address.CS_FEE_DISTRIBUTOR_ADDRESS, ethProvider)
  const csFeeOracleRunner = CSFeeOracle__factory.connect(address.CS_FEE_ORACLE_ADDRESS, ethProvider)

  const ethClient = new ETHProvider(
    logger,
    metrics,
    ethProvider,
    etherscanProvider,
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const csModuleSrv = new CSModuleSrv(logger, ethClient)

  const csFeeDistributorSrv = new CSFeeDistributorSrv(
    logger,
    ethClient,
    getCSFeeDistributorEvents(address.CS_FEE_DISTRIBUTOR_ADDRESS),
    address.CS_ACCOUNTING_ADDRESS,
    address.CS_FEE_DISTRIBUTOR_ADDRESS,
    address.LIDO_STETH_ADDRESS,
    address.HASH_CONSENSUS_ADDRESS,
  )

  const csAccountingSrv = new CSAccountingSrv(
    logger,
    ethClient,
    getCSAccountingEvents(address.CS_ACCOUNTING_ADDRESS),
    address.CS_ACCOUNTING_ADDRESS,
    address.LIDO_STETH_ADDRESS,
  )

  const csFeeOracleSrv = new CSFeeOracleSrv(
    logger,
    ethClient,
    getHashConsensusEvents(address.HASH_CONSENSUS_ADDRESS),
    getCSFeeOracleEvents(address.CS_FEE_ORACLE_ADDRESS),
    address.HASH_CONSENSUS_ADDRESS,
    address.CS_FEE_ORACLE_ADDRESS,
  )

  const proxyWatcherSrv = new ProxyWatcherSrv(
    logger,
    ethClient,
    getOssifiedProxyEvents(csmProxyContracts),
    getPausableEvents(pausableContracts),
    getAssetRecovererEvents(contractsWithAssetRecoverer),
  )

  const onAppFindings: Finding[] = []

  const healthChecker = new HealthChecker(logger, metrics, BorderTime, MaxNumberErrorsPerBorderTime)

  const gRPCserver = new grpc.Server()
  const blockH = new BlockHandler(
    logger,
    metrics,
    csModuleSrv,
    csAccountingSrv,
    csFeeDistributorSrv,
    csFeeOracleSrv,
    healthChecker,
    onAppFindings,
  )
  const txH = new TxHandler(
    metrics,
    csModuleSrv,
    csFeeDistributorSrv,
    csAccountingSrv,
    csFeeOracleSrv,
    proxyWatcherSrv,
    healthChecker,
  )
  const healthH = new HealthHandler(healthChecker, metrics, logger, config.ethereumRpcUrl, config.chainId)

  const latestBlockNumber = await ethClient.getBlockNumber()
  if (E.isLeft(latestBlockNumber)) {
    logger.error(latestBlockNumber.left)

    process.exit(1)
  }

  const initH = new InitHandler(
    config.appName,
    logger,
    csModuleSrv,
    csFeeDistributorSrv,
    csAccountingSrv,
    csFeeOracleSrv,
    proxyWatcherSrv,
    onAppFindings,
    latestBlockNumber.right,
  )
  const alertH = new AlertHandler()

  gRPCserver.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    evaluateTx: txH.handleTx(),
    healthCheck: healthH.healthGrpc(),
    evaluateAlert: alertH.handleAlert(),
  })

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
