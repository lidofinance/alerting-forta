import * as grpc from '@grpc/grpc-js'
import { ethers } from 'ethers'
import express, { Express, Request, Response } from 'express'
import { getEthersProvider } from 'forta-agent/dist/sdk/utils'
import { either as E } from 'fp-ts'
import { knex } from 'knex'
import * as fs from 'node:fs'
import promClient from 'prom-client'
import * as Winston from 'winston'
import { ETHProvider } from './clients/eth_provider'
import { AgentService } from './generated/proto/agent_grpc_pb'
import { Finding } from './generated/proto/alert_pb'
import {
  AstETH__factory,
  ChainlinkAggregator__factory,
  CurvePool__factory,
  GateSeal__factory,
  Lido__factory,
  StableDebtStETH__factory,
  ValidatorsExitBusOracle__factory,
  VariableDebtStETH__factory,
  WithdrawalQueueERC721__factory,
} from './generated/typechain'
import { AlertHandler } from './handlers/alert.handler'
import { BlockHandler } from './handlers/block.handler'
import { HealthHandler } from './handlers/health.handler'
import { InitHandler } from './handlers/init.handler'
import { TxHandler } from './handlers/tx.handler'
import { AaveSrv } from './services/aave/Aave.srv'
import { GateSealCache } from './services/gate-seal/GateSeal.cache'
import { GateSealSrv } from './services/gate-seal/GateSeal.srv'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { PoolBalanceCache } from './services/pools-balances/pool-balance.cache'
import { PoolBalanceSrv } from './services/pools-balances/pool-balance.srv'
import { StethOperationCache } from './services/steth_operation/StethOperation.cache'
import { StethOperationSrv } from './services/steth_operation/StethOperation.srv'
import { StorageWatcherSrv } from './services/storage-watcher/StorageWatcher.srv'
import { VaultSrv } from './services/vault/Vault.srv'
import { WithdrawalsCache } from './services/withdrawals/Withdrawals.cache'
import { WithdrawalsRepo } from './services/withdrawals/Withdrawals.repo'
import { WithdrawalsSrv } from './services/withdrawals/Withdrawals.srv'
import { Address, STORAGE_SLOTS } from './utils/constants'
import { Config } from './utils/env/env'
import { getBurnerEvents } from './utils/events/burner_events'
import { getDepositSecurityEvents } from './utils/events/deposit_security_events'
import { getInsuranceFundEvents } from './utils/events/insurance_fund_events'
import { getLidoEvents } from './utils/events/lido_events'
import { getWithdrawalsEvents } from './utils/events/withdrawals_events'
import { Metrics } from './utils/metrics/metrics'
import Version from './utils/version'

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
  defaultRegistry.collectDefaultMetrics()

  const customRegister = new promClient.Registry()
  const mergedRegistry = promClient.Registry.merge([defaultRegistry.register, customRegister])
  mergedRegistry.setDefaultLabels({
    instance: config.instance,
    dataProvider: config.dataProvider,
    botName: config.promPrefix,
  })

  const metrics = new Metrics(mergedRegistry)

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)
  let fortaEthersProvider = getEthersProvider()
  if (!config.useFortaProvider) {
    fortaEthersProvider = ethProvider
  }

  const address: Address = Address
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, fortaEthersProvider)

  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, ethProvider)

  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.VEBO_ADDRESS, fortaEthersProvider)

  const astRunner = AstETH__factory.connect(address.AAVE_ASTETH_ADDRESS, ethProvider)

  const stableDebtStEthRunner = StableDebtStETH__factory.connect(address.AAVE_STABLE_DEBT_STETH_ADDRESS, ethProvider)
  const variableDebtStEthRunner = VariableDebtStETH__factory.connect(
    address.AAVE_VARIABLE_DEBT_STETH_ADDRESS,
    ethProvider,
  )

  const curvePoolRunner = CurvePool__factory.connect(address.CURVE_POOL_ADDRESS, ethProvider)
  const chainlinkAggregatorRunner = ChainlinkAggregator__factory.connect(
    address.CHAINLINK_STETH_PRICE_FEED,
    ethProvider,
  )

  const ethClient = new ETHProvider(
    logger,
    metrics,
    ethProvider,
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    astRunner,
    stableDebtStEthRunner,
    variableDebtStEthRunner,
    curvePoolRunner,
    chainlinkAggregatorRunner,
    veboRunner,
  )

  const aaveSrv = new AaveSrv(logger, ethClient, address.AAVE_ASTETH_ADDRESS)

  const cache = new PoolBalanceCache()
  const poolBalanceSrv = new PoolBalanceSrv(logger, ethClient, cache)

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
    ethClient,
    address.WITHDRAWALS_VAULT_ADDRESS,
    address.EL_REWARDS_VAULT_ADDRESS,
    address.BURNER_ADDRESS,
    address.LIDO_STETH_ADDRESS,
  )

  const storageWatcherSrv = new StorageWatcherSrv(logger, STORAGE_SLOTS, ethClient)

  try {
    await dbClient.migrate.latest()

    const sql = fs.readFileSync('./src/db/withdrawal_requests_20_08_24.sql', 'utf8')
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
    storageWatcherSrv,
    aaveSrv,
    poolBalanceSrv,
    healthChecker,
    onAppFindings,
    ethClient,
  )
  const txH = new TxHandler(
    metrics,
    stethOperationSrv,
    withdrawalsSrv,
    gateSealSrv,
    vaultSrv,
    poolBalanceSrv,
    healthChecker,
  )
  const healthH = new HealthHandler(healthChecker, metrics, logger, config.ethereumRpcUrl, config.chainId)

  const latestBlock = await ethClient.getBlockByHash('latest')
  if (E.isLeft(latestBlock)) {
    logger.error(latestBlock.left)

    process.exit(1)
  }

  const initH = new InitHandler(
    config.appName,
    logger,
    stethOperationSrv,
    withdrawalsSrv,
    gateSealSrv,
    vaultSrv,
    poolBalanceSrv,
    onAppFindings,
    latestBlock.right,
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

  const stethOperationSrvErr = await stethOperationSrv.initialize(latestBlock.right.number)
  if (stethOperationSrvErr !== null) {
    logger.error('Could not init stethSrv', stethOperationSrvErr)

    process.exit(1)
  }

  const gateSealSrvErr = await gateSealSrv.initialize(latestBlock.right.number)
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
