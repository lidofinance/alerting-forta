import { App } from '../app'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import * as E from 'fp-ts/Either'

const TEST_TIMEOUT = 120_000

describe('ScrollProvider', () => {
  test(
    'fetchBlocks',
    async () => {
      const app = await App.getInstance()

      const startL2BlockNumber = 5_927_000
      const endL2BlockNumber = 5_927_050
      const l2Blocks = await app.scrollClient.fetchL2Blocks(startL2BlockNumber, endL2BlockNumber)

      expect(l2Blocks.length).toEqual(endL2BlockNumber - startL2BlockNumber + 1)
    },
    TEST_TIMEOUT,
  )

  test(
    'getWstEthTotalSupply is 7620.760541243359204164 wstEth',
    async () => {
      const app = await App.getInstance()

      const baseBlockNumber = 5_927_366
      const balance = await app.scrollClient.getWstEthTotalSupply(baseBlockNumber)
      if (E.isLeft(balance)) {
        throw balance.left
      }

      expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('7620.760541243359204164'))
    },
    TEST_TIMEOUT,
  )
})
