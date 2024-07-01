import * as grpc from '@grpc/grpc-js'
import { either as E } from 'fp-ts'
import { BlockHandler } from './handlers/block.handler'
import { HealthHandler } from './handlers/health.handler'
import { TxHandler } from './handlers/tx.handler'
import { InitHandler } from './handlers/init.handler'
import { AlertHandler } from './handlers/alert.handler'
import { AgentService } from './generated/proto/agent_grpc_pb'
import express, { Express, Request, Response } from 'express'
import Version from './utils/version'
import { Finding } from './generated/proto/alert_pb'
import { Config } from './utils/env/env'
import { knex } from 'knex'
import * as Winston from 'winston'
import { ethers } from 'ethers'
import { Address } from './utils/constants'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from './generated/typechain'
import { ETHProvider } from './clients/eth_provider'
import { StethOperationCache } from './services/steth_operation/StethOperation.cache'
import { getDepositSecurityEvents } from './utils/events/deposit_security_events'
import { getLidoEvents } from './utils/events/lido_events'
import { getInsuranceFundEvents } from './utils/events/insurance_fund_events'
import { getBurnerEvents } from './utils/events/burner_events'
import { WithdrawalsRepo } from './services/withdrawals/Withdrawals.repo'
import { WithdrawalsCache } from './services/withdrawals/Withdrawals.cache'
import { getWithdrawalsEvents } from './utils/events/withdrawals_events'
import { GateSealCache } from './services/gate-seal/GateSeal.cache'
import promClient from 'prom-client'
import { Metrics } from './utils/metrics/metrics'
import { StethOperationSrv } from './services/steth_operation/StethOperation.srv'
import { WithdrawalsSrv } from './services/withdrawals/Withdrawals.srv'
import { GateSealSrv } from './services/gate-seal/GateSeal.srv'
import { VaultSrv } from './services/vault/Vault.srv'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { getEthersProvider } from 'forta-agent/dist/sdk/utils'
import * as fs from 'node:fs'

const main = async () => {
  const config = new Config()
  const dbClient = knex(config.knexConfig)
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

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)
  let fortaEthersProvider = getEthersProvider()
  if (!config.useFortaProvider) {
    fortaEthersProvider = ethProvider
  }

  const etherscanProvider = new ethers.providers.EtherscanProvider(ethProvider.network, config.etherscanKey)
  const address: Address = Address
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, fortaEthersProvider)

  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, ethProvider)

  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.EXIT_BUS_ORACLE_ADDRESS, fortaEthersProvider)

  const ethClient = new ETHProvider(
    logger,
    metrics,
    fortaEthersProvider,
    etherscanProvider,
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    veboRunner,
  )

  const drpcClient = new ETHProvider(
    logger,
    metrics,
    ethProvider,
    etherscanProvider,
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    veboRunner,
  )

  const stethOperationCache = new StethOperationCache()
  const stethOperationSrv = new StethOperationSrv(
    logger,
    stethOperationCache,
    ethClient,
    address.DEPOSIT_SECURITY_ADDRESS,
    address.LIDO_STETH_ADDRESS,
    address.DEPOSIT_EXECUTOR_ADDRESS,
    getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
    getLidoEvents(address.LIDO_STETH_ADDRESS),
    getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
    getBurnerEvents(address.BURNER_ADDRESS),
  )

  const withdrawalsSrv = new WithdrawalsSrv(
    logger,
    new WithdrawalsRepo(dbClient),
    ethClient,
    new WithdrawalsCache(),
    getWithdrawalsEvents(address.WITHDRAWALS_QUEUE_ADDRESS),
    address.WITHDRAWALS_QUEUE_ADDRESS,
    address.LIDO_STETH_ADDRESS,
  )

  const gateSealSrv = new GateSealSrv(
    logger,
    ethClient,
    new GateSealCache(),
    address.GATE_SEAL_DEFAULT_ADDRESS,
    address.GATE_SEAL_FACTORY_ADDRESS,
  )

  const vaultSrv = new VaultSrv(
    logger,
    drpcClient,
    address.WITHDRAWALS_VAULT_ADDRESS,
    address.EL_REWARDS_VAULT_ADDRESS,
    address.BURNER_ADDRESS,
    address.LIDO_STETH_ADDRESS,
  )

  try {
    await dbClient.migrate.latest()

    const sql = fs.readFileSync('./src/db/withdrawal_requests_01_07_24.sql', 'utf8')
    await dbClient.raw(sql)

    logger.info('Migrations have been run successfully.')
  } catch (error) {
    logger.error('Error running migrations:', error)
    process.exit(1)
  }

  const onAppFindings: Finding[] = []

  const healthChecker = new HealthChecker(logger, metrics, BorderTime, MaxNumberErrorsPerBorderTime)

  const gRPCserver = new grpc.Server()
  const blockH = new BlockHandler(
    logger,
    metrics,
    stethOperationSrv,
    withdrawalsSrv,
    gateSealSrv,
    vaultSrv,
    healthChecker,
    onAppFindings,
  )
  const txH = new TxHandler(metrics, stethOperationSrv, withdrawalsSrv, gateSealSrv, vaultSrv, healthChecker)
  const healthH = new HealthHandler(healthChecker, metrics, logger, config.ethereumRpcUrl, config.chainId)

  const latestBlockNumber = await ethClient.getBlockNumber()
  if (E.isLeft(latestBlockNumber)) {
    logger.error(latestBlockNumber.left)

    process.exit(1)
  }

  const initH = new InitHandler(
    config.appName,
    logger,
    stethOperationSrv,
    withdrawalsSrv,
    gateSealSrv,
    vaultSrv,
    onAppFindings,
    latestBlockNumber.right,
  )
  const alertH = new AlertHandler()

  gRPCserver.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    evaluateTx: txH.handleTx(),
    healthCheck: healthH.healthGrpc(),
    // not used, but required for grpc contract
    evaluateAlert: alertH.handleAlert(),
  })

  const stethOperationSrvErr = await stethOperationSrv.initialize(latestBlockNumber.right)
  if (stethOperationSrvErr !== null) {
    logger.error('Could not init stethSrv', stethOperationSrvErr)

    process.exit(1)
  }

  const gateSealSrvErr = await gateSealSrv.initialize(latestBlockNumber.right)
  if (gateSealSrvErr instanceof Error) {
    logger.error('Could not init gateSealSrvErr', gateSealSrvErr)

    process.exit(1)
  } else {
    onAppFindings.push(...gateSealSrvErr)
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
