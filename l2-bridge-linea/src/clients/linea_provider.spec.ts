import { App } from '../app'
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../utils/constants'
import BigNumber from 'bignumber.js'

describe('linea provider tests', () => {
  test('should fetch block logs', async () => {
    const app = await App.getInstance()

    const latestBlock = await app.LineaClient.getLatestBlock()
    if (E.isLeft(latestBlock)) {
      throw latestBlock
    }

    const blocksDto = await app.LineaClient.getLogs(latestBlock.right.number, latestBlock.right.number)
    if (E.isLeft(blocksDto)) {
      throw blocksDto
    }

    expect(blocksDto.right.length).toBeGreaterThan(1)
  }, 120_000)

  test('getWstEth is 1696.070092078019991932 wsETH', async () => {
    const app = await App.getInstance()

    const lineaBlockNumber = 3_567_282
    const balance = await app.LineaClient.getWstEthTotalSupply(lineaBlockNumber)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('1696.070092078019991932'))
  }, 120_000)
})
