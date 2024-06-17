import { LogDescription, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import { CrossChainForwarderSrv } from './CrossChainForwarder.srv'
import { CROSS_CHAIN_FORWARDER_ADDRESS } from '../../utils/constants'

const MOCK_BLOCK_NUMBER = 100

describe('CrossChainForwarderSrv', () => {
  let logger: Logger
  let crossChainForwarderSrv: CrossChainForwarderSrv
  let txEvent: TransactionEvent

  beforeEach(() => {
    logger = { info: jest.fn(), debug: jest.fn() } as unknown as Logger
    crossChainForwarderSrv = new CrossChainForwarderSrv(logger, CROSS_CHAIN_FORWARDER_ADDRESS)
    txEvent = {
      addresses: { '0x123': true },
      filterLog: jest.fn(),
      blockNumber: MOCK_BLOCK_NUMBER,
    } as unknown as TransactionEvent
  })

  it('initializes without error', () => {
    expect(() => crossChainForwarderSrv.initialize(MOCK_BLOCK_NUMBER)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(crossChainForwarderSrv.getName()).toBe('CrossChainForwarderSrv')
  })

  it('handles transaction without errors', async () => {
    jest.spyOn(txEvent, 'filterLog').mockReturnValue([])
    const findings = await crossChainForwarderSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it('handles transaction without findings when no matching events', async () => {
    txEvent.addresses[CROSS_CHAIN_FORWARDER_ADDRESS] = true
    jest.mocked(txEvent.filterLog).mockReturnValue([])

    const findings = await crossChainForwarderSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it('handles transaction with findings when matching events', async () => {
    txEvent.addresses[CROSS_CHAIN_FORWARDER_ADDRESS] = true
    jest
      .mocked(txEvent.filterLog)
      .mockReturnValue([
        { args: { address: '0x0000000000000000000000000000000000000000', isApproved: true } },
        { args: { address: '0x0000000000000000000000000000000000000001', isApproved: false } },
      ] as unknown as LogDescription[])

    const findings = await crossChainForwarderSrv.handleTransaction(txEvent)

    expect(findings).toHaveLength(2)
    expect(findings[0].name).toBe('🚨🚨🚨 BNB a.DI: Approved sender changed')
  })
})
