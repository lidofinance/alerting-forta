import { App } from '../../app'
import { BlockDto } from '../../entity/events'
import { ethers, Finding, FindingSeverity, FindingType, getEthersProvider } from 'forta-agent'

const TEST_TIMEOUT = 180_000

describe('agent-pools-balances functional tests', () => {
  let ethProvider: ethers.providers.JsonRpcProvider

  const mainnet = 1
  const drpcProvider = 'https://eth.drpc.org/'

  beforeAll(async () => {
    ethProvider = new ethers.providers.JsonRpcProvider(drpcProvider, mainnet)
  })

  test(
    'should process block with imbalanced Curve pool',
    async () => {
      const app = await App.getInstance(drpcProvider)
      const blockNumber = 16804419

      const block = await ethProvider.getBlock(blockNumber)
      const initBlock = await ethProvider.getBlock(blockNumber - 10)

      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      const initBlockDto: BlockDto = {
        number: initBlock.number,
        timestamp: initBlock.timestamp,
        parentHash: initBlock.parentHash,
      }

      await app.PoolBalanceSrv.init(initBlockDto)
      const result = await app.PoolBalanceSrv.handleBlock(blockDto)

      const expected = Finding.fromObject({
        alertId: 'CURVE-POOL-IMBALANCE',
        description: `Current pool state:\n` + `ETH - 432969.66 (44.87%)\n` + `stETH - 531933.72 (55.13%)`,
        name: '⚠️ Curve Pool is imbalanced',
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )

  it(
    'should process block with significant Curve pool change',
    async () => {
      const app = await App.getInstance(drpcProvider)
      const startBlock = 16_870_589
      const endBlock = 16_870_590

      const initBlock = await ethProvider.getBlock(startBlock)

      const initBlockDto: BlockDto = {
        number: initBlock.number,
        timestamp: initBlock.timestamp,
        parentHash: initBlock.parentHash,
      }

      await app.PoolBalanceSrv.init(initBlockDto)

      const result: Finding[] = []
      for (let b = startBlock; b <= endBlock; b++) {
        const block = await ethProvider.getBlock(b)

        const blockDto: BlockDto = {
          number: block.number,
          timestamp: block.timestamp,
          parentHash: block.parentHash,
        }

        const f = await app.PoolBalanceSrv.handleBlock(blockDto)

        result.push(...f)
      }

      const expected = Finding.fromObject({
        alertId: 'CURVE-POOL-SIZE-CHANGE',
        description: `Curve Pool size has decreased by 13.24% since the last block`,
        name: '🚨 Significant Curve Pool size change',
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })

      expect(result.length).toEqual(1)
      expect(result[0].alertId).toEqual(expected.alertId)
      expect(result[0].description).toEqual(expected.description)
      expect(result[0].name).toEqual(expected.name)
      expect(result[0].severity).toEqual(expected.severity)
      expect(result[0].type).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )

  it(
    'Total unstaked stETH increased',
    async () => {
      const app = await App.getInstance(drpcProvider)
      const startBlock = 16_038_250
      const endBlock = 16_038_263

      const initBlock = await ethProvider.getBlock(startBlock)

      const initBlockDto: BlockDto = {
        number: initBlock.number,
        timestamp: initBlock.timestamp,
        parentHash: initBlock.parentHash,
      }

      await app.PoolBalanceSrv.init(initBlockDto)

      const result: Finding[] = []
      for (let b = startBlock; b <= endBlock; b++) {
        const block = await ethProvider.getBlock(b)

        const blockDto: BlockDto = {
          number: block.number,
          timestamp: block.timestamp,
          parentHash: block.parentHash,
        }

        const f = await app.PoolBalanceSrv.handleBlock(blockDto)
        result.push(...f)
      }

      const expected: Finding[] = [
        Finding.fromObject({
          alertId: 'CURVE-POOL-IMBALANCE-RAPID-CHANGE',
          description:
            'Prev reported pool sate:\n' +
            'ETH - 227230.48 (33.86%)\n' +
            'stETH - 443785.27 (66.14%)\n' +
            'Current pool state:\n' +
            'ETH - 151562.64 (25.84%)\n' +
            'stETH - 435021.57 (74.16%)',
          name: '🚨 Curve Pool rapid imbalance change',
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        }),
        Finding.fromObject({
          alertId: 'CURVE-POOL-SIZE-CHANGE',
          description: 'Curve Pool size has increased by 14.39% since the last block',
          name: '🚨 Significant Curve Pool size change',
          severity: FindingSeverity.High,
          type: FindingType.Info,
        }),
      ]

      expect(result.length).toEqual(2)
      for (let i = 0; i <= 1; i++) {
        expect(result[i].alertId).toEqual(expected[i].alertId)
        expect(result[i].description).toEqual(expected[i].description)
        expect(result[i].name).toEqual(expected[i].name)
        expect(result[i].severity).toEqual(expected[i].severity)
        expect(result[i].type).toEqual(expected[i].type)
      }
    },
    TEST_TIMEOUT,
  )
})
