import { getEthersProvider } from 'forta-agent'
import { App } from '../../src/app'
import { etherBlockToFortaBlockEvent } from './utils'

const TEST_TIMEOUT = 160_000 // ms

describe('agent-proxy-watcher e2e tests', () => {
  let logSpy: jest.SpyInstance
  let timeSpy: jest.SpyInstance

  const ethProvider = getEthersProvider()

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log')
    logSpy.mockImplementation(() => {})
    timeSpy = jest.spyOn(Date, 'now')
    timeSpy.mockImplementation(() => new Date('2023-12-31'))
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should process block with changed proxy implementation',
    async () => {
      const app = await App.getInstance()

      const blockNumber = 15_018_882
      const block = await ethProvider.getBlock(blockNumber)

      await app.ProxyWatcherSrv.initialize(14_524_801)
      const blockEvent = etherBlockToFortaBlockEvent(block)
      const findings = await app.ProxyWatcherSrv.handleBlock(blockEvent)
      findings.sort((a, b) => (a.description < b.description ? -1 : 1))
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process block with changed proxy implementation, no subsequent findings expected',
    async () => {
      const app = await App.getInstance()

      const blockNumber = 15_018_883
      const block = await ethProvider.getBlock(blockNumber)

      const blockEvent = etherBlockToFortaBlockEvent(block)
      const findings = await app.ProxyWatcherSrv.handleBlock(blockEvent)

      expect(findings.length).toBe(0)
    },
    TEST_TIMEOUT,
  )
})
