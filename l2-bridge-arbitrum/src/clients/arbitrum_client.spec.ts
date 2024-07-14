import { ArbERC20__factory, ERC20Bridged__factory, L2ERC20TokenGateway__factory } from '../generated/typechain'
import { ArbitrumClient } from './arbitrum_client'
import { Address, ETH_DECIMALS } from '../utils/constants'
import { ethers } from 'forta-agent'
import { Config } from '../utils/env/env'
import promClient from 'prom-client'
import * as E from 'fp-ts/Either'
import { Metrics } from '../utils/metrics/metrics'
import BigNumber from 'bignumber.js'

const TEST_TIMEOUT = 120_000

describe('arbitrumProvider', () => {
  const config = new Config()
  const adr: Address = Address

  const arbitrumProvider = new ethers.providers.JsonRpcProvider(config.arbitrumRpcUrl, config.chainId)

  const l2Bridge = L2ERC20TokenGateway__factory.connect(adr.ARBITRUM_L2_TOKEN_GATEWAY.address, arbitrumProvider)
  const bridgedWSthEthRunner = ERC20Bridged__factory.connect(adr.ARBITRUM_WSTETH_BRIDGED.address, arbitrumProvider)
  const bridgedLdoRunner = ArbERC20__factory.connect(adr.ARBITRUM_LDO_BRIDGED_ADDRESS, arbitrumProvider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)
  const l2Client = new ArbitrumClient(arbitrumProvider, metrics, l2Bridge, bridgedWSthEthRunner, bridgedLdoRunner)

  const l2BlockNumber = 228_303_887
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
      const blockNumber = await l2Client.getBlockNumber()
      if (E.isLeft(blockNumber)) {
        throw blockNumber.left
      }

      expect(Number.isInteger(blockNumber.right)).toBe(true)
    },
    TEST_TIMEOUT,
  )

  test(
    'getWstEthTotalSupply is 64_352.622267221200683868 wstEth',
    async () => {
      const wstBalance = await l2Client.getWstEthTotalSupply(l2BlockNumber)
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
      const ldoBalance = await l2Client.getLdoTotalSupply(l2BlockNumber)
      if (E.isLeft(ldoBalance)) {
        throw ldoBalance.left
      }

      expect(ldoBalance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('928089.575013945159998755'))
    },
    TEST_TIMEOUT,
  )
})
