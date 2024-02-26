import { App } from '../src/app'
import * as E from 'fp-ts/Either'

describe('agent-linea e2e tests', () => {
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
})
