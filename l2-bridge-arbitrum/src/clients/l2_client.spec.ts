import { ArbERC20__factory, ERC20Bridged__factory } from '../generated/typechain'
import { L2Client } from './l2_client'
import { Address, ETH_DECIMALS } from '../utils/constants'
import { ethers } from 'ethers'
import { Config } from '../utils/env/env'
import * as promClient from 'prom-client'
import * as E from 'fp-ts/Either'
import { Metrics } from '../utils/metrics/metrics'
import BigNumber from 'bignumber.js'
import * as Winston from 'winston'

const TEST_TIMEOUT = 120_000

describe('l2Client', () => {
  const config = new Config()
  const adr: Address = Address

  const l2Provider = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.arbChainID)

  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, l2Provider)
  const bridgedLdoRunner = ArbERC20__factory.connect(adr.ARBITRUM_LDO_BRIDGED_ADDRESS, l2Provider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister)

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const l2Client = new L2Client(l2Provider, metrics, bridgedWSthEthRunner, bridgedLdoRunner, logger)

  const l2BlockHash = '0x5f0b1658096ed3521655dd968e867b6bcf7c8bde6fdc6049150ada403a0cd5e1'

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

  test(
    'fetchL2Logs is ok',
    async () => {
      const fromL2block = 228_029_924
      const tol2Block = fromL2block + 1_000

      const l2Logs = await l2Client.fetchL2Logs(fromL2block, tol2Block, [
        adr.GOV_BRIDGE_ADDRESS,
        adr.ARBITRUM_L2_TOKEN_GATEWAY.address,
        adr.ARBITRUM_WSTETH_BRIDGED.address,
      ])
      if (E.isLeft(l2Logs)) {
        throw l2Logs.left
      }

      expect(l2Logs.right.length).toBe(51)
    },
    TEST_TIMEOUT,
  )

  test(
    'fetchL2Logs is benchmark',
    async () => {
      // diff 691_200
      const fromL2block = 233_109_192
      const tol2Block = 233_800_392

      const l2Logs = await l2Client.fetchL2Logs(fromL2block, tol2Block, [adr.ARBITRUM_L2_TOKEN_GATEWAY.address])
      if (E.isLeft(l2Logs)) {
        throw l2Logs.left
      }

      expect(l2Logs.right.length).toBe(16)
    },
    TEST_TIMEOUT,
  )

  test(
    'fetchL2blocks is benchmark',
    async () => {
      const fromL2block = 233_109_192
      const tol2Block = fromL2block + 999

      const l2Blocks = await l2Client.fetchL2Blocks(fromL2block, tol2Block)

      expect(l2Blocks.length).toBe(1_000)
    },
    TEST_TIMEOUT * 2,
  )
})
