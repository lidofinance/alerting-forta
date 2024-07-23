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
import { Address, DeploymentAddresses } from './utils/constants.holesky'
import { ETHProvider } from './clients/eth_provider'
import { getCSFeeDistributorEvents } from './utils/events/cs_fee_distributor_events'
import { getCSFeeOracleEvents, getHashConsensusEvents } from './utils/events/cs_fee_oracle_events'
import { getOssifiedProxyEvents } from './utils/events/ossified_proxy_events'
import { getPausableEvents } from './utils/events/pausable_events'
import { getCSAccountingEvents } from './utils/events/cs_accounting_events'
import { getBurnerEvents } from './utils/events/burner_events'
import * as promClient from 'prom-client'
import { Metrics } from './utils/metrics/metrics'
import { CSModuleSrv } from './services/CSModule/CSModule.srv'
import { CSFeeDistributorSrv } from './services/CSFeeDistributor/CSFeeDistributor.srv'
import { CSAccountingSrv } from './services/CSAccounting/CSAccounting.srv'
import { CSFeeOracleSrv } from './services/CSFeeOracle/CSFeeOracle.srv'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { getEthersProvider } from 'forta-agent/dist/sdk/utils'
import express = require('express')

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

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl)
  let fortaEthersProvider = getEthersProvider()
  if (!config.useFortaProvider) {
    fortaEthersProvider = ethProvider
  }

  const etherscanProvider = new ethers.providers.EtherscanProvider(ethProvider.network, config.etherscanKey)
  const address: Address = DeploymentAddresses

  const csModuleRunner = CSModule__factory.connect(address.CS_MODULE_ADDRESS, fortaEthersProvider)
  const csAccountingRunner = CSAccounting__factory.connect(address.CS_ACCOUNTING_ADDRESS, fortaEthersProvider)
  const csFeeDistributorRunner = CSFeeDistributor__factory.connect(
    address.CS_FEE_DISTRIBUTOR_ADDRESS,
    fortaEthersProvider,
  )
  const csFeeOracleRunner = CSFeeOracle__factory.connect(address.CS_FEE_ORACLE_ADDRESS, fortaEthersProvider)

  const ethClient = new ETHProvider(
    logger,
    metrics,
    fortaEthersProvider,
    etherscanProvider,
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const csModuleSrv = new CSModuleSrv(
    logger,
    ethClient,
    getOssifiedProxyEvents(),
    getPausableEvents(),
    getBurnerEvents(address.BURNER_ADDRESS),
  )

  const csFeeDistributorSrv = new CSFeeDistributorSrv(
    logger,
    ethClient,
    getOssifiedProxyEvents(),
    getBurnerEvents(address.BURNER_ADDRESS),
    getCSFeeDistributorEvents(address.CS_FEE_DISTRIBUTOR_ADDRESS),
  )

  const csAccountingSrv = new CSAccountingSrv(
    logger,
    ethClient,
    getOssifiedProxyEvents(),
    getPausableEvents(),
    getBurnerEvents(address.BURNER_ADDRESS),
    getCSAccountingEvents(address.CS_ACCOUNTING_ADDRESS),
  )

  const csFeeOracleSrv = new CSFeeOracleSrv(
    logger,
    ethClient,
    getOssifiedProxyEvents(),
    getPausableEvents(),
    getBurnerEvents(address.BURNER_ADDRESS),
    getHashConsensusEvents(address.HASH_CONSENSUS_ADDRESS),
    getCSFeeOracleEvents(address.CS_FEE_ORACLE_ADDRESS),
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
  const txH = new TxHandler(metrics, csModuleSrv, csFeeDistributorSrv, csAccountingSrv, csFeeOracleSrv, healthChecker)
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
