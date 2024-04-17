import { App } from '../app'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../utils/constants'
import BigNumber from 'bignumber.js'

describe('eth provider tests', () => {
  test('getBalanceByBlockHash is 1250.249051355549848434 wstEth', async () => {
    const app = await App.getInstance()
    const adr = Address

    const l1blockNumber = 19_619_102
    const balance = await app.ethClient.getWstEthBalance(l1blockNumber, adr.ZKSYNC_L1ERC20_TOKEN_BRIDGE_ADDRESS)
    if (E.isLeft(balance)) {
      throw balance.left
    }

    expect(balance.right.dividedBy(ETH_DECIMALS)).toEqual(new BigNumber('1250.249051355549848434'))
  }, 120_000)
})
