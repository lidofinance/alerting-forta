import { Logger } from 'winston'
import { IEasyTrackClient } from '../easy-track/contract'
import { BlockEvent, TransactionEvent } from 'forta-agent'
import { CrossChainClient } from './contract'
import { CrossChainWatcherSrv } from './CrossChainWatcher.srv'
import * as handlers from './handlers'

describe('CrossChainWatcherSrv', () => {
  let logger: Logger
  let ethProvider: CrossChainClient
  let crossChainSrv: CrossChainWatcherSrv
  let txEvent: TransactionEvent

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = { getNOInfoByMotionData: jest.fn() } as unknown as IEasyTrackClient
    crossChainSrv = new CrossChainWatcherSrv(logger, ethProvider)
    txEvent = { addresses: { '0x123': true }, filterLog: jest.fn() } as unknown as TransactionEvent
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('initializes without error', () => {
    expect(() => crossChainSrv.initialize(100)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(crossChainSrv.getName()).toBe('CrossChainWatcher')
  })

  it('calls handleBridgeBalance on handleBlock', async () => {
    const block = { block: { number: 100 } } as unknown as BlockEvent
    jest.spyOn(handlers, 'handleBridgeBalance').mockResolvedValue([])

    const findings = await crossChainSrv.handleBlock(block)

    expect(findings).toEqual([])
    expect(handlers.handleBridgeBalance).toHaveBeenCalledWith(block)
  })
})
