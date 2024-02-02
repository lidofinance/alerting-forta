import { App } from '../app'
import * as E from 'fp-ts/Either'

describe('eth provider tests', () => {
  test('getWithdrawalStatuses should return 1750 withdrawal statuses', async () => {
    const app = await App.getInstance()

    const blockNumber = 19112800
    const requestsRange: number[] = []
    for (let i = 21001; i <= 22750; i++) {
      requestsRange.push(i)
    }

    const statuses = await app.ethClient.getWithdrawalStatuses(requestsRange, blockNumber)
    if (E.isLeft(statuses)) {
      fail(statuses.left.message)
    }

    expect(statuses.right.length).toEqual(1750)
  }, 120_000)
})
