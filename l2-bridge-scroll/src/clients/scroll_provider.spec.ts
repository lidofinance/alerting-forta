import { App } from '../app'

describe('ScrollProvider', () => {
  test('fetchBlocks', async () => {
    const app = await App.getInstance()

    const start = 4_496_000
    const end = 4_497_000
    const blocks = await app.scrollClient.fetchBlocks(start, end)

    expect(blocks.length).toEqual(end - start + 1)
  }, 120_000)
})
