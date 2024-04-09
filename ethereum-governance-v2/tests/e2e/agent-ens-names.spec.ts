import { getEthersProvider } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'
import { App } from '../../src/app'
import { etherBlockToFortaBlockEvent } from './utils'

describe('ens-names e2e tests', () => {
  let ethProvider: JsonRpcProvider
  let logSpy: jest.SpyInstance
  let timeSpy: jest.SpyInstance

  beforeAll(async () => {
    ethProvider = getEthersProvider()

    logSpy = jest.spyOn(console, 'log')
    logSpy.mockImplementation(() => {})
    timeSpy = jest.spyOn(Date, 'now')
    timeSpy.mockImplementation(() => new Date('2023-12-31'))
  })

  test('should return empty array', async () => {
    const app = await App.getInstance()

    const blockNumber = 17_000_000
    const block = await ethProvider.getBlock(blockNumber)

    await app.EnsNamesSrv.initialize(blockNumber)
    const blockEvent = etherBlockToFortaBlockEvent(block)
    const result = await app.EnsNamesSrv.handleBlock(blockEvent)
    expect(result.length).toEqual(0)
  }, 60000)
})
