import { Logger } from 'winston'
import * as E from 'fp-ts/Either'
import { BlockEvent, TransactionEvent } from 'forta-agent'
import { ICrossChainClient } from './contract'
import { CrossChainWatcherSrv } from './CrossChainWatcher.srv'
import * as handlers from './handlers'
import * as notice from '../../shared/notice'
import { BSC_L1_CROSS_CHAIN_CONTROLLER_EVENTS } from '../../shared/events/cross_chain_events'

describe('CrossChainWatcherSrv', () => {
  let logger: Logger
  let ethProvider: jest.Mocked<ICrossChainClient>
  let crossChainSrv: CrossChainWatcherSrv
  let txEvent: TransactionEvent

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = { getBSCForwarderBridgeAdapterNames: jest.fn() } as unknown as jest.Mocked<ICrossChainClient>
    crossChainSrv = new CrossChainWatcherSrv(logger, ethProvider)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  it('initializes with BSC adapters successfully', async () => {
    const bscAdapters = E.right(new Map([['adapter1', '0x123']]))
    ethProvider.getBSCForwarderBridgeAdapterNames.mockResolvedValue(bscAdapters)

    await crossChainSrv.initialize(100)

    expect(E.isRight(bscAdapters)).toBe(true)
    if (bscAdapters._tag !== 'Left') {
      expect(crossChainSrv['bscAdapters']).toEqual(bscAdapters.right)
    }
    expect(ethProvider.getBSCForwarderBridgeAdapterNames).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalled()
  })

  it('initializes with error fetching BSC adapters', async () => {
    const error = E.left(new Error('Failed to fetch'))
    ethProvider.getBSCForwarderBridgeAdapterNames.mockResolvedValue(error)
    console.warn = jest.fn()

    await crossChainSrv.initialize(100)

    expect(crossChainSrv['bscAdapters']).toEqual(new Map())
    expect(console.warn).toHaveBeenCalledWith(
      'Error fetching BSC forwarder bridge adapter names: Failed to fetch. Adapter names substitutions will not be available.',
    )
    expect(logger.info).toHaveBeenCalled()
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

  it('calls handleTransactionForwardingAttempt on handleTransaction', async () => {
    const bscAdapters = new Map([['adapter1', '0x123']])
    crossChainSrv['bscAdapters'] = bscAdapters
    txEvent = { transaction: { hash: '0x123' }, addresses: {} } as unknown as TransactionEvent
    jest.spyOn(handlers, 'handleTransactionForwardingAttempt').mockResolvedValue([])

    const findings = await crossChainSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
    expect(handlers.handleTransactionForwardingAttempt).toHaveBeenCalledWith(txEvent, bscAdapters)
  })

  it('calls handleEventsOfNotice on handleTransaction', async () => {
    txEvent = { transaction: { hash: '0x123' }, addresses: {} } as unknown as TransactionEvent
    jest.spyOn(notice, 'handleEventsOfNotice').mockReturnValue([])

    const findings = await crossChainSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
    expect(notice.handleEventsOfNotice).toHaveBeenCalledWith(txEvent, BSC_L1_CROSS_CHAIN_CONTROLLER_EVENTS)
  })
})
