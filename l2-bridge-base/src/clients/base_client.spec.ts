import { App } from '../app'
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../utils/constants'
import BigNumber from 'bignumber.js'

describe('base provider tests', () => {
  test('should fetch block logs', async () => {
    const app = await App.getInstance()

    const latestBlock = await app.baseClient.getLatestL2Block()
    if (E.isLeft(latestBlock)) {
      throw latestBlock
    }

    const blocksDto = await app.baseClient.getL2Logs(latestBlock.right.number, latestBlock.right.number)
    if (E.isLeft(blocksDto)) {
      throw blocksDto
    }

    expect(blocksDto.right.length).toBeGreaterThan(1)
  }, 120_000)

  test('getWstEthTotalSupply is 1696.070092078019991932 wsETH', async () => {
    const app = await App.getInstance()

    const baseBlockNumber = 13_022_744
    const balance = await app.baseClient.getWstEthTotalSupply(baseBlockNumber)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('11430.956916416032084584'))
  }, 120_000)
})
