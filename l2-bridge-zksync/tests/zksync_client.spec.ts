import { App } from '../src/app'
import * as E from 'fp-ts/Either'

describe('agent-zkSync e2e tests', () => {
  test('should fetch block logs', async () => {
    const app = await App.getInstance()

    const latestBlock = await app.zkSyncClient.getLatestBlock()
    if (E.isLeft(latestBlock)) {
      throw latestBlock.left
    }

    const logs = await app.zkSyncClient.getLogs(latestBlock.right.number, latestBlock.right.number)
    if (E.isLeft(logs)) {
      throw logs.left
    }

    expect(logs.right.length).toBeGreaterThan(1)
  }, 120_000)
})
