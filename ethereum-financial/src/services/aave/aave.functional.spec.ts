import { App } from '../../app'
import { BlockDto } from '../../entity/events'
import { ethers } from 'forta-agent'

const TEST_TIMEOUT = 180_000

describe('aave functional tests', () => {
  let ethProvider: ethers.providers.JsonRpcProvider

  const mainnet = 1
  const drpcProvider = 'https://eth.drpc.org/'

  beforeAll(async () => {
    ethProvider = new ethers.providers.JsonRpcProvider(drpcProvider, mainnet)
  })

  test(
    'should NOT alert 🚨🚨🚨 astETH balance - astETH totalSupply >= 1ETH',
    async () => {
      const app = await App.getInstance(drpcProvider)
      const blockNumber = 19_589_514

      const block = await ethProvider.getBlock(blockNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      const findings = await app.AaveSrv.handleAstEthSupply(blockDto)
      expect(findings.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )
})
