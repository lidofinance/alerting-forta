import { App } from '../app'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import * as E from 'fp-ts/Either'

describe('MantleProvider', () => {
  test('fetchBlocks', async () => {
    const app = await App.getInstance()

    const start = 50_183_000
    const end = 50_184_000
    const blocks = await app.mantleClient.fetchL2Blocks(start, end)

    expect(blocks.length).toEqual(end - start + 1)
  }, 120_000)

  test('getWstEthTotalSupply is 9.860230303930711579 wsETH', async () => {
    const app = await App.getInstance()

    const baseBlockNumber = 62_393_461
    const balance = await app.mantleClient.getWstEthTotalSupply(baseBlockNumber)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('9.860230303930711579'))
  }, 120_000)
})
