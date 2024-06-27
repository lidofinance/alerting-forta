import { ERC20Short__factory, L2Bridge__factory } from '../generated/typechain'
import { OptimismClient } from './optimism_client'
import { Address, ETH_DECIMALS } from '../utils/constants'
import { ethers } from 'forta-agent'
import { Config } from '../utils/env/env'
import promClient from 'prom-client'
import * as E from 'fp-ts/Either'
import { Metrics } from '../utils/metrics/metrics'
import BigNumber from 'bignumber.js'

const TEST_TIMEOUT = 120_000

describe('OptimismProvider', () => {
  const config = new Config()
  const adr: Address = Address

  const optimismProvider = new ethers.providers.JsonRpcProvider(config.optimismRpcUrl, config.chainId)

  const l2Bridge = L2Bridge__factory.connect(adr.OPTIMISM_L2_TOKEN_GATEWAY.address, optimismProvider)
  const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.OPTIMISM_WSTETH_BRIDGED.address, optimismProvider)
  const bridgedLdoRunner = ERC20Short__factory.connect(adr.OPTIMISM_LDO_BRIDGED_ADDRESS, optimismProvider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)
  const l2Client = new OptimismClient(optimismProvider, metrics, l2Bridge, bridgedWSthEthRunner, bridgedLdoRunner)

  const l2BlockNumber = 121_951_308
  test(
    'getWithdrawalEvents is 1',
    async () => {
      const wEvents = await l2Client.getWithdrawalEvents(121_867_825, 121_867_825)
      if (E.isLeft(wEvents)) {
        throw wEvents.left
      }

      expect(wEvents.right.length).toEqual(1)
    },
    TEST_TIMEOUT,
  )

  test(
    'getWithdrawalRecords is 2.008529093774247442 wstEth',
    async () => {
      const wEvents = await l2Client.getWithdrawalEvents(121_867_825, 121_867_825)
      if (E.isLeft(wEvents)) {
        throw wEvents.left
      }

      const wRecords = await l2Client.getWithdrawalRecords(wEvents.right)
      if (E.isLeft(wRecords)) {
        throw wRecords.left
      }

      expect(wRecords.right[0].amount.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('2.008529093774247442'))
    },
    TEST_TIMEOUT,
  )

  test(
    'getBlockNumber is 7620.760541243359204164 wstEth',
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
    'getWstEthTotalSupply is 27_714.2248906558075528 wstEth',
    async () => {
      const wstBalance = await l2Client.getWstEthTotalSupply(l2BlockNumber)
      if (E.isLeft(wstBalance)) {
        throw wstBalance.left
      }

      expect(wstBalance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('27714.2248906558075528'))
    },
    TEST_TIMEOUT,
  )

  test(
    'getLdoTotalSupply is 43_1964.875080527270013624 wstEth',
    async () => {
      const ldoBalance = await l2Client.getLdoTotalSupply(l2BlockNumber)
      if (E.isLeft(ldoBalance)) {
        throw ldoBalance.left
      }

      expect(ldoBalance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('431964.875080527270013624'))
    },
    TEST_TIMEOUT,
  )
})
