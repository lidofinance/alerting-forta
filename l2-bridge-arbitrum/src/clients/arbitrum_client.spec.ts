import { ArbERC20__factory, ERC20Bridged__factory, L2ERC20TokenGateway__factory } from '../generated/typechain'
import { ArbitrumClient, Direction } from './arbitrum_client'
import { Address, ETH_DECIMALS } from '../utils/constants'
import { ethers } from 'ethers'
import { Config } from '../utils/env/env'
import promClient from 'prom-client'
import * as E from 'fp-ts/Either'
import { Metrics } from '../utils/metrics/metrics'
import BigNumber from 'bignumber.js'
import { BlockDtoWithTransactions, BlockHash } from '../entity/blockDto'
import { LRUCache } from 'lru-cache'
import { elapsedTime, SECONDS_60 } from '../utils/time'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import * as Winston from 'winston'

const TEST_TIMEOUT = 120_000

describe('arbitrumProvider', () => {
  const config = new Config()
  const adr: Address = Address

  const arbitrumProvider = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.arbChainID)

  const l2Bridge = L2ERC20TokenGateway__factory.connect(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, arbitrumProvider)
  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, arbitrumProvider)
  const bridgedLdoRunner = ArbERC20__factory.connect(adr.ARBITRUM_LDO_BRIDGED_ADDRESS, arbitrumProvider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)

  const ethProvider = config.useFortaProvider
    ? new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), config.chainId)
    : new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const l2BlocksStore = new LRUCache<BlockHash, BlockDtoWithTransactions>({
    max: 500,
    ttl: 1000 * 60 * 2,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  })

  const l2BridgeCache = new LRUCache<BlockHash, BigNumber>({
    max: 500,
    ttl: 1000 * 60 * 2,
    updateAgeOnGet: true,
    updateAgeOnHas: true,
  })
  const l2Client = new ArbitrumClient(
    arbitrumProvider,
    metrics,
    l2Bridge,
    bridgedWSthEthRunner,
    bridgedLdoRunner,
    l2BlocksStore,
    l2BridgeCache,
  )

  const l2BlockHash = '0x5f0b1658096ed3521655dd968e867b6bcf7c8bde6fdc6049150ada403a0cd5e1'
  test(
    'getWithdrawalEvents is 1',
    async () => {
      const wEvents = await l2Client.getWithdrawalEvents(228_029_924, 228_029_924)
      if (E.isLeft(wEvents)) {
        throw wEvents.left
      }

      expect(wEvents.right.length).toEqual(1)
    },
    TEST_TIMEOUT,
  )

  test(
    'getWithdrawalRecords is 4 wstEth',
    async () => {
      const wEvents = await l2Client.getWithdrawalEvents(227_842_886, 228_029_924)
      if (E.isLeft(wEvents)) {
        throw wEvents.left
      }

      const wRecords = await l2Client.getWithdrawalRecords(wEvents.right)
      if (E.isLeft(wRecords)) {
        throw wRecords.left
      }

      expect(wRecords.right[0].amount.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('4'))
    },
    TEST_TIMEOUT,
  )

  test(
    'getBlockNumber',
    async () => {
      const blockNumber = await l2Client.getLatestL2Block()
      if (E.isLeft(blockNumber)) {
        throw blockNumber.left
      }

      expect(Number.isInteger(blockNumber.right.number)).toBe(true)
    },
    TEST_TIMEOUT,
  )

  test(
    'getWstEthTotalSupply is 64_352.622267221200683868 wstEth',
    async () => {
      const wstBalance = await l2Client.getWstEthTotalSupply(l2BlockHash)
      if (E.isLeft(wstBalance)) {
        throw wstBalance.left
      }

      expect(wstBalance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('64352.622267221200683868'))
    },
    TEST_TIMEOUT,
  )

  test(
    'getLdoTotalSupply is 92_8089.575013945159998755 ldo',
    async () => {
      const ldoBalance = await l2Client.getLdoTotalSupply(l2BlockHash)
      if (E.isLeft(ldoBalance)) {
        throw ldoBalance.left
      }

      expect(ldoBalance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('928089.575013945159998755'))
    },
    TEST_TIMEOUT,
  )

  test('latest l2 block in future', async () => {
    const [
      l1Block, // Jul-15-2024 10:29:11 AM +UTC)
      l2Block, //  (Jul-15-2024 10:30:09 AM +UTC)
      neededl2Block, //  (Jul-15-2024 10:30:11 AM +UTC)
    ] = await Promise.all([
      ethProvider.getBlock(20_311_318),
      l2Client.getL2BlockDto(232_432_922),
      l2Client.getL2BlockDto(232_432_930),
    ])

    if (E.isLeft(l2Block)) {
      throw l2Block
    }
    if (E.isLeft(neededl2Block)) {
      throw neededl2Block
    }

    expect(neededl2Block.right.timestamp).toEqual(l1Block.timestamp + SECONDS_60)

    const left = l1Block.timestamp
    const right = l1Block.timestamp + SECONDS_60
    const target = right

    const startTime = new Date()
    const latestL2Block = await l2Client.search(left, right, target, l2Block.right)
    if (E.isLeft(latestL2Block)) {
      throw latestL2Block
    }

    logger.info(
      `l2timestamp: ${latestL2Block.right.timestamp} \n` +
        `Neededtimestamp: ${l1Block.timestamp + 60} \n` +
        `l1timestamp: ${l1Block.timestamp} \n` +
        `l2number: ${latestL2Block.right.number} \n` +
        `l1date: ${new Date(l1Block.timestamp * 1000).toUTCString()} \n` +
        `l2date: ${new Date(latestL2Block.right.timestamp * 1000).toUTCString()} \n`,
    )

    logger.info(elapsedTime('latest l2 block in future', startTime.getTime()))
    expect(latestL2Block.right.number).toEqual(232_432_930)
    expect(latestL2Block.right.timestamp - l1Block.timestamp).toEqual(SECONDS_60)
  }, 60_000)

  test('oldest l2 block in past', async () => {
    // (Jul-15-2024 10:29:11 AM +UTC)
    const l1Block = await ethProvider.getBlock(20_311_318)

    //  (Jul-15-2024 10:28:56 AM +UTC)
    const l2Block = await l2Client.getL2BlockDto(232_432_622)
    if (E.isLeft(l2Block)) {
      throw l2Block
    }

    const left = l1Block.timestamp - SECONDS_60
    const right = l1Block.timestamp
    const target = left

    const startTime = new Date()
    const oldestL2Block = await l2Client.search(left, right, target, l2Block.right)
    if (E.isLeft(oldestL2Block)) {
      throw oldestL2Block
    }

    logger.info(
      `l2timestamp: ${oldestL2Block.right.timestamp} \n` +
        `l1timestamp: ${l1Block.timestamp} \n` +
        `l2number: ${oldestL2Block.right.number} \n` +
        `l1date: ${new Date(l1Block.timestamp * 1000).toUTCString()} \n` +
        `l2date: ${new Date(oldestL2Block.right.timestamp * 1000).toUTCString()} \n`,
    )

    expect(l1Block.timestamp - oldestL2Block.right.timestamp).toEqual(SECONDS_60)
    expect(oldestL2Block.right.number).toEqual(232_432_439)
    logger.info(elapsedTime('oldest l2 block in past', startTime.getTime()))
  }, 60_000)
})
