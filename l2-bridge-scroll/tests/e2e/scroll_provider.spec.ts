import { App } from '../../src/app'

describe('MantleProvider', () => {
  test('fetchBlocks', async () => {
    const app = await App.getInstance()

    const start = 50_183_000
    const end = 50_184_000
    const blocks = await app.mantleClient.fetchBlocks(start, end)

    expect(blocks.length).toEqual(end - start + 1)
  }, 120_000)
})
