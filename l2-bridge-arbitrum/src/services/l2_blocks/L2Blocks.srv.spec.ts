import { ethers } from 'ethers'
import * as promClient from 'prom-client'
import * as Winston from 'winston'
import BigNumber from 'bignumber.js'
import { LRUCache } from 'lru-cache'
import { L2BlocksSrv } from './L2Blocks.srv'
import { L2BlocksRepo } from './L2Blocks.repo'
import { knex } from 'knex'
import * as E from 'fp-ts/Either'
import { Config } from '../../utils/env/env'
import { Address } from '../../utils/constants'
import { ArbERC20__factory, ERC20Bridged__factory } from '../../generated/typechain'
import { Metrics } from '../../utils/metrics/metrics'
import { L2Client } from '../../clients/l2_client'
import { ETHProvider } from '../../clients/eth_provider_client'
const TEST_TIMEOUT = 120_000

describe('L2BlocksSrv', () => {
  const config = new Config()
  const adr: Address = Address

  const dbClient = knex(Config.getTestKnexConfig(':memory:'))
  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const arbitrumProvider = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.arbChainID)

  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, arbitrumProvider)
  const bridgedLdoRunner = ArbERC20__factory.connect(adr.ARBITRUM_LDO_BRIDGED_ADDRESS, arbitrumProvider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)

  const l2Client = new L2Client(arbitrumProvider, metrics, bridgedWSthEthRunner, bridgedLdoRunner, logger)

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)

  const wSthEthRunner = ERC20Bridged__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
  const ldoRunner = ERC20Bridged__factory.connect(adr.L1_LDO_ADDRESS, ethProvider)

  const l1BlocksStore = new LRUCache<string, BigNumber>({
    max: 500,
  })
  const l1Client = new ETHProvider(
    metrics,
    wSthEthRunner,
    ldoRunner,
    ethProvider,
    l1BlocksStore,
    adr.ARBITRUM_L1_TOKEN_BRIDGE,
    adr.ARBITRUM_L1_LDO_BRIDGE,
    logger,
  )

  const L2BlockRepo = new L2BlocksRepo(dbClient)

  const l2BlocksSrv = new L2BlocksSrv(l2Client, L2BlockRepo, [
    adr.GOV_BRIDGE_ADDRESS,
    adr.ARBITRUM_L2_TOKEN_GATEWAY.address,
    adr.ARBITRUM_WSTETH_BRIDGED.address,
  ])

  beforeAll(async () => {
    try {
      await dbClient.migrate.rollback({}, true)
      await dbClient.migrate.latest()
    } catch (error) {
      logger.error('Could migrate:', error)
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
    'l2BlocksSrv stores latest l2 block',
    async () => {
      const l1BlockV0 = await l1Client.getBlockByTag('latest')
      if (E.isLeft(l1BlockV0)) {
        throw l1BlockV0
      }

      const storeV0 = await l2BlocksSrv.updGetL2blocksStore(l1BlockV0.right)
      if (E.isLeft(storeV0)) {
        throw storeV0
      }

      expect(storeV0.right.prevLatestL2Block.number > 0).toEqual(true)
      expect(storeV0.right.l2Blocks.length).toEqual(1)

      await new Promise((f) => setTimeout(f, 15 * 1000))

      const l1BlockV1 = await l1Client.getBlockByTag('latest')
      if (E.isLeft(l1BlockV1)) {
        throw l1BlockV1
      }

      const storeV1 = await l2BlocksSrv.updGetL2blocksStore(l1BlockV1.right)
      if (E.isLeft(storeV1)) {
        throw storeV1
      }

      expect(storeV1.right.prevLatestL2Block).toEqual(storeV0.right.prevLatestL2Block)
      expect(storeV1.right.l2Blocks.length > 1).toEqual(true)

      await new Promise((f) => setTimeout(f, 15 * 1000))

      const l1BlockV2 = await l1Client.getBlockByTag('latest')
      if (E.isLeft(l1BlockV2)) {
        throw l1BlockV2
      }

      const latestL2Block = await L2BlockRepo.getLastL2Block()
      if (E.isLeft(latestL2Block)) {
        throw latestL2Block
      }
      if (latestL2Block === null) {
        throw new Error(`Could not fetch first l2 block from db`)
      }

      const storeV2 = await l2BlocksSrv.updGetL2blocksStore(l1BlockV2.right)
      if (E.isLeft(storeV2)) {
        throw storeV2
      }

      expect(storeV2.right.prevLatestL2Block.number !== storeV0.right.prevLatestL2Block.number).toEqual(true)
      expect(storeV2.right.l2Blocks.length > 1).toEqual(true)
      expect(storeV2.right.prevLatestL2Block).toEqual(latestL2Block.right)
    },
    TEST_TIMEOUT,
  )
})
