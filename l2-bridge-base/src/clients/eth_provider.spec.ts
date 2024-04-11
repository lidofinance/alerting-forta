import { App } from '../app'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../utils/constants'
import BigNumber from 'bignumber.js'

describe('eth provider tests', () => {
  test('getBalanceByBlockHash is 10786.9163900726000737487 wsETH', async () => {
    const app = await App.getInstance()
    const adr = Address

    const blockNumber = 19_619_102
    const balance = await app.ethClient.getWstEthBalance(blockNumber, adr.BASE_L1ERC20_TOKEN_BRIDGE)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('10786.916390072600073748'))
  }, 120_000)
})
