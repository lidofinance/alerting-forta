import { ArbERC20__factory, ERC20Bridged__factory } from '../generated/typechain'
import { Address, ETH_DECIMALS } from '../utils/constants'
import { ethers } from 'ethers'
import { Config } from '../utils/env/env'
import * as promClient from 'prom-client'
import { Metrics } from '../utils/metrics/metrics'
import { L2Client } from '../clients/l2_client'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { WithdrawalSrv } from './monitor_withdrawals'
import { WithdrawalRepo } from './monitor_withdrawals.repo'
import { knex } from 'knex'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import * as process from 'process'
import { L2BlocksRepo } from './l2_blocks/L2Blocks.repo'
import { L2BlocksSrv } from './l2_blocks/L2Blocks.srv'
import { ETHProvider } from '../clients/eth_provider_client'
import { LRUCache } from 'lru-cache'

const TEST_TIMEOUT = 120_000

describe('monitor_withdrawals', () => {
  const config = new Config()
  const dbClient = knex(config.knexConfig)

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  beforeAll(async () => {
    await dbClient.migrate.rollback({}, true)
    await dbClient.migrate.latest()
  })

  afterAll(async () => {
    try {
      await dbClient.migrate.rollback({}, true)
    } catch (error) {
      logger.error('Could not destroy db:', error)
      process.exit(1)
    }
  })

  const defaultRegistry = promClient
  defaultRegistry.collectDefaultMetrics({
    prefix: config.promPrefix,
  })

  const customRegister = new promClient.Registry()
  const mergedRegistry = promClient.Registry.merge([defaultRegistry.register, customRegister])
  mergedRegistry.setDefaultLabels({ instance: config.instance, dataProvider: config.dataProvider })

  const metrics = new Metrics(mergedRegistry)

  const ethProvider = config.useFortaProvider
    ? new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), config.chainId)
    : new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)

  const l2NodeClient = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.arbChainID)

  const adr: Address = Address

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
    ttl: 60 * 30,
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

  beforeEach(async () => {
    try {
      await dbClient.migrate.rollback({}, true)
    } catch (error) {
      logger.error('Could not destroy db:', error)
      process.exit(1)
    }

    try {
      await dbClient.migrate.latest()
    } catch (error) {
      logger.error('Error running migrations:', error)
      process.exit(1)
    }
  })

  afterAll(async () => {
    try {
      await dbClient.migrate.rollback({}, true)
    } catch (error) {
      logger.error('Could not destroy db:', error)
      process.exit(1)
    }
  })

  test(
    'getWithdrawalEvents is 1',
    async () => {
      const fromBlock = 228_029_924
      const toBlock = 228_029_924

      const [l2Blocks, l2Logs] = await Promise.all([
        l2Client.fetchL2Blocks(fromBlock, toBlock),
        l2Client.fetchL2Logs(fromBlock, toBlock, [adr.ARBITRUM_L2_TOKEN_GATEWAY.address]),
      ])

      if (E.isLeft(l2Logs)) {
        throw l2Logs.left
      }

      const withdrawalFindings = await withdrawalsSrv.toMonitor(l2Logs.right, l2Blocks)
      const result = await withdrawalRepo.getWithdrawalStat()
      if (E.isLeft(result)) {
        throw result.left
      }

      const expectedAmount = new BigNumber('1732302579999414411').div(ETH_DECIMALS).toNumber()

      expect(result.right.amount).toBe(expectedAmount)
      expect(result.right.total).toBe(1)
      expect(withdrawalFindings.length).toBe(0)
    },
    TEST_TIMEOUT,
  )

  test(
    'Withdrawal records is 2',
    async () => {
      const fromBlock = 227_842_886
      const toBlock = 228_029_924

      const l2Logs = await l2Client.fetchL2Logs(fromBlock, toBlock, [adr.ARBITRUM_L2_TOKEN_GATEWAY.address])
      if (E.isLeft(l2Logs)) {
        throw l2Logs.left
      }

      const l2BlockNumberSet = new Set<number>()
      for (const l2log of l2Logs.right) {
        l2BlockNumberSet.add(new BigNumber(l2log.blockNumber).toNumber())
      }

      const l2Blocks = await l2Client.fetchL2BlocksByList(Array.from(l2BlockNumberSet))

      const records = withdrawalsSrv.getWithdrawals(l2Logs.right, l2Blocks)
      expect(records.length).toBe(2)

      const withdrawalFindings = await withdrawalsSrv.toMonitor(l2Logs.right, l2Blocks)
      const result = await withdrawalRepo.getWithdrawalStat()
      if (E.isLeft(result)) {
        throw result.left
      }

      const expectedAmount = 5.7323025799994145

      expect(result.right.amount).toBe(expectedAmount)
      expect(result.right.total).toBe(2)
      expect(withdrawalFindings.length).toBe(0)
    },
    TEST_TIMEOUT,
  )

  test(
    `withdrawalsSrv.toMonitor`,
    async () => {
      const toBlock = 228_029_925
      const fromBlock = toBlock - 100

      const [l2Blocks, l2Logs] = await Promise.all([
        l2Client.fetchL2Blocks(fromBlock, toBlock),
        l2Client.fetchL2Logs(fromBlock, toBlock, [adr.ARBITRUM_L2_TOKEN_GATEWAY.address]),
      ])

      if (E.isLeft(l2Logs)) {
        throw l2Logs.left
      }

      const withdrawalFindings = await withdrawalsSrv.toMonitor(l2Logs.right, l2Blocks)
      expect(withdrawalFindings.length).toEqual(0)

      const result = await withdrawalRepo.getWithdrawalStat()
      if (E.isLeft(result)) {
        throw result.left
      }
      const expectedAmount = new BigNumber('1732302579999414411').div(ETH_DECIMALS).toNumber()

      expect(result.right.amount).toBe(expectedAmount)
      expect(result.right.total).toBe(1)
    },
    TEST_TIMEOUT,
  )

  test(
    `withdrawalsSrv.init`,
    async () => {
      const toBlock = 228_030_025
      const fromBlock = toBlock - 100

      const init = await withdrawalsSrv.initialize(fromBlock)
      if (E.isLeft(init)) {
        throw init.left
      }
      expect(init.right.length).toEqual(0)

      const result = await withdrawalRepo.getWithdrawalStat()
      if (E.isLeft(result)) {
        throw result.left
      }
      const expectedAmount = 16.308364966171016

      expect(result.right.amount).toBe(expectedAmount)
      expect(result.right.total).toBe(5)
    },
    TEST_TIMEOUT,
  )
})
