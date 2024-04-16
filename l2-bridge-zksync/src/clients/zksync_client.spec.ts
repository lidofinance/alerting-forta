import { App } from '../app'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import * as E from 'fp-ts/Either'

describe('ZkSyncProvider', () => {
  test('fetchBlocks', async () => {
    const app = await App.getInstance()

    const start = 31_653_550
    const end = 31_653_600
    const blocks = await app.zkSyncClient.fetchL2Blocks(start, end)

    expect(blocks.length).toEqual(end - start + 1)
  }, 120_000)

  test('getWstEthTotalSupply is 1177.342778779487684996 wstEth', async () => {
    const app = await App.getInstance()

    const baseBlockNumber = 31_653_550
    const balance = await app.zkSyncClient.getWstEthTotalSupply(baseBlockNumber)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('1177.342778779487684996'))
  }, 120_000)
})
