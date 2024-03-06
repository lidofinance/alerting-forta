import { App } from '../src/app'
import * as E from 'fp-ts/Either'
import { Finding } from 'forta-agent'
import { handleBlock, initialize } from '../src/agent'
import { etherBlockToFortaBlockEvent } from './utils'

describe('agent-base e2e tests', () => {
  test('should process app', async () => {
    const init = initialize()
    await init()

    const handleBlocks = handleBlock()
    const app = await App.getInstance()

    const latestBlock = await app.baseClient.getLatestL2Block()
    if (E.isLeft(latestBlock)) {
      throw latestBlock.left
    }

    const batchPromises: Promise<Finding[]>[] = []
    const blocksDto = await app.baseClient.fetchL2Blocks(latestBlock.right.number - 100, latestBlock.right.number)

    for (const b of blocksDto) {
      const blockEvent = etherBlockToFortaBlockEvent(b)
      batchPromises.push(handleBlocks(blockEvent))
    }

    const out: Finding[] = []
    const arrayOfFindings = await Promise.all(batchPromises)
    for (const findings of arrayOfFindings) {
      out.push(...findings)
    }

    expect(out.length).toEqual(1)
    expect(out[0].name).toEqual(`Agent launched, ScannerId: 0x556f8BE42f76c01F960f32CB1936D2e0e0Eb3F4D`)
  }, 360_000)
})
