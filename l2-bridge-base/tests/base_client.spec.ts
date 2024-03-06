import { App } from '../src/app'
import * as E from 'fp-ts/Either'

describe('agent-zkSync e2e tests', () => {
  test('should fetch block logs', async () => {
    const app = await App.getInstance()

    const latestBlock = await app.baseClient.getLatestL2Block()
    if (E.isLeft(latestBlock)) {
      throw latestBlock.left
    }

    const logs = await app.baseClient.getL2Logs(latestBlock.right.number, latestBlock.right.number)
    if (E.isLeft(logs)) {
      throw logs.left
    }

    expect(logs.right.length).toBeGreaterThan(1)
  }, 120_000)
})
