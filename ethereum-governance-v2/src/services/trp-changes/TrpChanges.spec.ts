import { Logger } from 'winston'
import { TrpChangesSrv } from './TrpChanges.srv'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'

describe('TrpChangesSrv', () => {
  let logger: Logger
  let trpChangesSrv: TrpChangesSrv
  let txEvent: TransactionEvent

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    trpChangesSrv = new TrpChangesSrv(logger)
    txEvent = { addresses: { '0x123': true }, filterLog: jest.fn() } as unknown as TransactionEvent
  })

  it('initializes without error', () => {
    expect(() => trpChangesSrv.initialize(100)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(trpChangesSrv.getName()).toBe('TrpChangesSrv')
  })

  it('handles transaction without error', async () => {
    const findings = await trpChangesSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
  })
})
