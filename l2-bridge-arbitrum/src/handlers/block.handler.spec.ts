import { ArbERC20__factory, ERC20Bridged__factory, OssifiableProxy__factory } from '../generated/typechain'
import { Address } from '../utils/constants'
import { ethers } from 'ethers'
import { Config } from '../utils/env/env'
import * as promClient from 'prom-client'
import { Metrics } from '../utils/metrics/metrics'
import { L2Client } from '../clients/l2_client'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { knex } from 'knex'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import * as process from 'process'
import { ETHProvider } from '../clients/eth_provider_client'
import { LRUCache } from 'lru-cache'
import * as fs from 'node:fs'
import { L2BlocksRepo } from '../services/l2_blocks/L2Blocks.repo'
import { L2BlocksSrv } from '../services/l2_blocks/L2Blocks.srv'
import { WithdrawalRepo } from '../services/monitor_withdrawals.repo'
import { WithdrawalSrv } from '../services/monitor_withdrawals'
import { ProxyWatcher } from '../services/proxy_watcher'
import { ProxyContractClient } from '../clients/proxy_contract_client'
import { EventWatcher } from '../services/event_watcher'
import { getL2BridgeEvents } from '../utils/events/bridge_events'
import { getGovEvents } from '../utils/events/gov_events'
import { getProxyAdminEvents } from '../utils/events/proxy_admin_events'
import { BridgeBalanceSrv } from '../services/bridge_balance'
import { BlockHandler } from './block.handler'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from '../services/health-checker/health-checker.srv'

const TEST_TIMEOUT = 120_000

describe(`block.handler`, () => {
  const config = new Config()
  const dbClient = knex(Config.getTestKnexConfig(':memory'))

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  beforeAll(async () => {
    try {
      await dbClient.migrate.rollback({}, true)
    } catch (error) {
      logger.error('Could not destroy db:', error)
      process.exit(1)
    }

    try {
      await dbClient.migrate.latest()

      const sql = fs.readFileSync('./src/db/seeds/l2_withdrawals.sql', 'utf8')
      await dbClient.raw(sql)
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
    adr.ARBITRUM_L1_TOKEN_BRIDGE,
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

  const proxyWatchers: ProxyWatcher[] = [
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

  const bridgeEventWatcher = new EventWatcher(
    'BridgeEventWatcher',
    getL2BridgeEvents(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, adr.RolesMap, config.networkName),
  )
  const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.GOV_BRIDGE_ADDRESS, config.networkName))
  const proxyEventWatcher = new EventWatcher(
    'ProxyEventWatcher',
    getProxyAdminEvents(adr.ARBITRUM_WSTETH_BRIDGED, adr.ARBITRUM_L2_TOKEN_GATEWAY, config.networkName),
  )

  const bridgeBalanceSrv = new BridgeBalanceSrv(logger, l1Client, l2Client, config.networkName, metrics)
  const healthChecker = new HealthChecker(logger, metrics, BorderTime, MaxNumberErrorsPerBorderTime)

  const blockH = new BlockHandler(
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
    [],

    l2BlocksSrv,
    config.networkName,
  )

  test(
    'Digest is ok',
    async () => {
      const l1Block = await l1Client.getBlockByTag('0x0da0a0ac67d936857a41cc0dfb6c59f588ebfde119b648b5f2fc7f617db8641a')
      if (E.isLeft(l1Block)) {
        throw l1Block
      }

      const l2Block = await l2Client.getL2BlockByTag(
        '0xbdb41b02c703a5cb513b4556beb84155a0930c081583aa35be220592c23b4e9c',
      )
      if (E.isLeft(l2Block)) {
        throw l2Block
      }

      await bridgeBalanceSrv.handleBlock(l1Block.right, [l2Block.right])

      const findings = await blockH.collectDigest(l1Block.right)

      expect(findings.length).toBe(1)

      const expectedDesc =
        'Bridge balances: \n' +
        '\tLDO:\n' +
        '\t\tL1: 994555.5638 LDO\n' +
        '\t\tL2: 994068.5564 LDO\n' +
        '\tStEth:\n' +
        '\t\tL1: 74347.0319 StEth\n' +
        '\t\tL2: 74219.0555 wstETH\n' +
        '\n' +
        'Withdrawals: \n' +
        '\tAmount: 78.80651963249112 \n' +
        '\tTotal: 2'

      expect(findings[0].getDescription()).toBe(expectedDesc)
    },
    TEST_TIMEOUT,
  )
})
