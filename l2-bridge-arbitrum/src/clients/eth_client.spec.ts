import { ethers } from 'ethers'
import { ERC20Bridged__factory } from '../generated/typechain'
import { ETHProvider } from './eth_provider_client'
import { Config } from '../utils/env/env'
import { Address, ETH_DECIMALS } from '../utils/constants'
import promClient from 'prom-client'
import { Metrics } from '../utils/metrics/metrics'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { BlockDtoWithTransactions, BlockHash } from '../entity/blockDto'
import { LRUCache } from 'lru-cache'

const TEST_TIMEOUT = 120_000

describe('ethProvider', () => {
  const config = new Config()

  const adr = Address

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, config.chainId)

  const wSthEthRunner = ERC20Bridged__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
  const ldoRunner = ERC20Bridged__factory.connect(adr.L1_LDO_ADDRESS, ethProvider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)

  const l1BlocksStore = new LRUCache<BlockHash, BigNumber>({
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
  )
  const l1BlockHash = '0xb98cace7cd13a459d5736755184217ec6a70f8d0c01dd051ec372832df077a2a'

  test(
    'getWstEthBalance is 66_725.331301424290867528 wstEth',
    async () => {
      const wStethBalance = await l1Client.getWstEthBalance(l1BlockHash)
      if (E.isLeft(wStethBalance)) {
        throw wStethBalance.left
      }

      expect(wStethBalance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('66725.331301424290867528'))
    },
    TEST_TIMEOUT,
  )

  test(
    'getLDOBalance is 89_0572.571209700629591106 LDO',
    async () => {
      const ldoBalance = await l1Client.getLDOBalance(l1BlockHash)
      if (E.isLeft(ldoBalance)) {
        throw ldoBalance.left
      }

      expect(ldoBalance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('890572.571209700629591106'))
    },
    TEST_TIMEOUT,
  )

  test(
    'getBlockNumber',
    async () => {
      /*    const blockNumber = await l1Client.getBlock(new Date())
      if (E.isLeft(blockNumber)) {
        throw blockNumber.left
      }

      expect(Number.isInteger(blockNumber.right.number)).toBe(true)*/
    },
    TEST_TIMEOUT,
  )
})
