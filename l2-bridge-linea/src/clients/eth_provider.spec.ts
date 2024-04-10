import { App } from '../app'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../utils/constants'
import BigNumber from 'bignumber.js'

describe('eth provider tests', () => {
  test('getBalanceByBlockHash is 1774.48511061073977627 wsETH', async () => {
    const app = await App.getInstance()
    const adr = Address

    const blockNumber = 19_619_102
    const balance = await app.ethClient.getWstEth(blockNumber, adr.LINEA_L1_TOKEN_BRIDGE)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('1774.48511061073977627'))
  }, 120_000)
})
