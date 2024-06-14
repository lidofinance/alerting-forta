import { handleEventsOfNotice, TransactionEventContract } from './notice'
import { Finding, FindingSeverity, FindingType, LogDescription } from 'forta-agent'
import { EventOfNotice } from './types'

describe('handleEventsOfNotice', () => {
  let txEvent: TransactionEventContract
  let eventsOfNotice: EventOfNotice[]

  beforeEach(() => {
    txEvent = {
      addresses: { '0x123': true },
      logs: [],
      filterLog: jest.fn(),
      to: '0x123',
      timestamp: 1000,
    }

    eventsOfNotice = [
      {
        address: '0x123',
        event: 'TestEvent',
        name: 'Test Event',
        description: jest.fn().mockReturnValue('Test description'),
        alertId: 'TEST-EVENT',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      },
    ]
  })

  it('returns empty array when no matching addresses', () => {
    txEvent.addresses = { '0x456': true }

    const findings = handleEventsOfNotice(txEvent, eventsOfNotice)

    expect(findings).toEqual([])
  })

  it('returns empty array when no matching events', () => {
    jest.mocked(txEvent.filterLog).mockReturnValue([])

    const findings = handleEventsOfNotice(txEvent, eventsOfNotice)

    expect(findings).toEqual([])
  })

  it('returns findings when matching addresses and events', () => {
    const mockArgs = { value: 'test' }
    jest.mocked(txEvent.filterLog).mockReturnValue([{ args: mockArgs } as unknown as LogDescription])

    const findings = handleEventsOfNotice(txEvent, eventsOfNotice)

    expect(findings).toEqual([
      Finding.fromObject({
        name: 'Test Event',
        description: 'Test description',
        alertId: 'TEST-EVENT',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        metadata: { args: String(mockArgs) },
      }),
    ])
  })
})
