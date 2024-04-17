import { App } from '../app'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import * as E from 'fp-ts/Either'

const TEST_TIMEOUT = 120_000

describe('ZkSyncProvider', () => {
  test(
    'fetchBlocks',
    async () => {
      const app = await App.getInstance()

      const startL2BlockNumber = 31_653_550
      const endL2BlockNumber = 31_653_600
      const l2Blocks = await app.zkSyncClient.fetchL2Blocks(startL2BlockNumber, endL2BlockNumber)

      expect(l2Blocks.length).toEqual(endL2BlockNumber - startL2BlockNumber + 1)
    },
    TEST_TIMEOUT,
  )

  test(
    'getWstEthTotalSupply is 1177.342778779487684996 wstEth',
    async () => {
      const app = await App.getInstance()

      const baseBlockNumber = 31_653_550
      const balance = await app.zkSyncClient.getWstEthTotalSupply(baseBlockNumber)
      if (E.isLeft(balance)) {
        throw balance.left
      }

      expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('1177.342778779487684996'))
    },
    TEST_TIMEOUT,
  )
})
