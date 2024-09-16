import { ethers } from 'ethers'
import * as promClient from 'prom-client'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { BlockDto } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
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
} from '../../generated/typechain'
import { Address } from '../../utils/constants'
import { Config } from '../../utils/env/env'
import { Metrics } from '../../utils/metrics/metrics'
import { PoolBalanceCache } from './pool-balance.cache'
import { PoolBalanceSrv, WEEK_1 } from './pool-balance.srv'

const TEST_TIMEOUT = 180_000

describe('agent-pools-balances functional tests', () => {
  const config = new Config()
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })
  const address: Address = Address
  const chainId = 1

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, chainId)
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, ethProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, ethProvider)
  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, ethProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.VEBO_ADDRESS, ethProvider)
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

  const defaultRegistry = promClient
  defaultRegistry.collectDefaultMetrics()

  const registry = new promClient.Registry()
  const metrics = new Metrics(registry)

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

  test(
    'should process block with imbalanced Curve pool',
    async () => {
      const blockNumber = 16_804_419

      const block = await ethProvider.getBlock(blockNumber)
      const initBlock = await ethProvider.getBlock(blockNumber - 10)

      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
        hash: block.hash,
      }

      const initBlockDto: BlockDto = {
        number: initBlock.number,
        timestamp: initBlock.timestamp,
        parentHash: initBlock.parentHash,
        hash: initBlock.hash,
      }

      const cache = new PoolBalanceCache()
      const poolBalanceSrv = new PoolBalanceSrv(logger, ethClient, cache)

      await poolBalanceSrv.init(initBlockDto)
      cache.lastReportedCurveImbalanceTimestamp -= WEEK_1

      const result = await poolBalanceSrv.handleBlock(blockDto)

      const expected = new Finding()
      expected.setAlertid('CURVE-POOL-IMBALANCE')
      expected.setName('⚠️ Curve Pool is imbalanced')
      expected.setDescription(`Current pool state:\n` + `ETH - 432969.66 (44.87%)\n` + `stETH - 531933.72 (55.13%)`)
      expected.setSeverity(Finding.Severity.MEDIUM)
      expected.setType(Finding.FindingType.SUSPICIOUS)
      expected.setProtocol('ethereum')

      expect(result.length).toEqual(1)
      expect(result[0]).toEqual(expected)
    },
    TEST_TIMEOUT,
  )

  test(
    'should process block with significant Curve pool change',
    async () => {
      const startBlock = 16_870_589
      const endBlock = 16_870_590

      const initBlock = await ethProvider.getBlock(startBlock)

      const initBlockDto: BlockDto = {
        number: initBlock.number,
        timestamp: initBlock.timestamp,
        parentHash: initBlock.parentHash,
        hash: initBlock.hash,
      }

      const cache = new PoolBalanceCache()
      const poolBalanceSrv = new PoolBalanceSrv(logger, ethClient, cache)

      await poolBalanceSrv.init(initBlockDto)

      const result: Finding[] = []
      for (let b = startBlock; b <= endBlock; b++) {
        const block = await ethProvider.getBlock(b)

        const blockDto: BlockDto = {
          number: block.number,
          timestamp: block.timestamp,
          parentHash: block.parentHash,
          hash: block.hash,
        }

        const f = await poolBalanceSrv.handleBlock(blockDto)

        result.push(...f)
      }

      const expected = new Finding()
      expected.setAlertid('CURVE-POOL-SIZE-CHANGE')
      expected.setName('🚨 Significant Curve Pool size change')
      expected.setDescription(`Curve Pool size has decreased by 13.24% since the last block`)
      expected.setSeverity(Finding.Severity.HIGH)
      expected.setType(Finding.FindingType.SUSPICIOUS)
      expected.setProtocol('ethereum')
      const m = expected.getMetadataMap()
      m.set('sizeBefore', '833732.119622588732317889')
      m.set('sizeAfter', '960964.420322769261730507')

      expect(result.length).toEqual(1)
      expect(result[0]).toEqual(expected)
    },
    TEST_TIMEOUT,
  )

  test(
    'Total unstaked stETH increased',
    async () => {
      const startBlock = 16_038_250
      const endBlock = 16_038_263

      const initBlock = await ethProvider.getBlock(startBlock)

      const initBlockDto: BlockDto = {
        number: initBlock.number,
        timestamp: initBlock.timestamp,
        parentHash: initBlock.parentHash,
        hash: initBlock.hash,
      }

      const cache = new PoolBalanceCache()
      const poolBalanceSrv = new PoolBalanceSrv(logger, ethClient, cache)

      await poolBalanceSrv.init(initBlockDto)

      const result: Finding[] = []
      for (let b = startBlock; b <= endBlock; b++) {
        const block = await ethProvider.getBlock(b)

        const blockDto: BlockDto = {
          number: block.number,
          timestamp: block.timestamp,
          parentHash: block.parentHash,
          hash: block.hash,
        }

        const f = await poolBalanceSrv.handleBlock(blockDto)

        result.push(...f)
      }

      const f1 = new Finding()
      f1.setAlertid('CURVE-POOL-IMBALANCE-RAPID-CHANGE')
      f1.setDescription(
        'Prev reported pool sate:\n' +
          'ETH - 227230.48 (33.86%)\n' +
          'stETH - 443785.27 (66.14%)\n' +
          'Current pool state:\n' +
          'ETH - 151562.64 (25.84%)\n' +
          'stETH - 435021.57 (74.16%)',
      )
      f1.setName('🚨 Curve Pool rapid imbalance change')
      f1.setSeverity(Finding.Severity.HIGH)
      f1.setType(Finding.FindingType.SUSPICIOUS)
      f1.setProtocol('ethereum')

      const f2 = new Finding()
      f2.setAlertid('CURVE-POOL-SIZE-CHANGE')
      f2.setDescription('Curve Pool size has increased by 14.39% since the last block')
      f2.setName('🚨 Significant Curve Pool size change')
      f2.setSeverity(Finding.Severity.HIGH)
      f2.setType(Finding.FindingType.SUSPICIOUS)
      f2.setProtocol('ethereum')
      const m = f2.getMetadataMap()
      m.set('sizeBefore', '671015.748930205199741286')
      m.set('sizeAfter', '586584.202191555161152463')

      const expected: Finding[] = [f1, f2]

      expect(result.length).toEqual(2)
      expect(result).toEqual(expected)
    },
    TEST_TIMEOUT,
  )
})
