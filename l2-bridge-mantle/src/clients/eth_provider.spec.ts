import { App } from '../app'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../utils/constants'
import BigNumber from 'bignumber.js'

describe('eth provider tests', () => {
  test('getBalanceByBlockHash is 10.151583036279178025 wsETH', async () => {
    const app = await App.getInstance()
    const adr = Address

    const blockNumber = 19_619_102
    const balance = await app.ethClient.getWstEthBalance(blockNumber, adr.MANTLE_L1ERC20_TOKEN_BRIDGE_ADDRESS)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('10.151583036279178025'))
  }, 120_000)
})
