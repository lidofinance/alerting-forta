import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../utils/types'
import { EventWatcherSrv } from './EventWatcher.srv'
import { Logger } from 'winston'
import { Log } from '@ethersproject/providers'
import { Interface } from '@ethersproject/abi'
import { getUniqueKey } from '../../utils/finding.helpers'

const MOCK_EVENTS_LIST: EventOfNotice[] = [
  {
    address: '0x123',
    event: 'event TestEvent(address indexed value)',
    name: 'Test Event',
    description: jest.fn().mockReturnValue('Test description'),
    alertId: 'TEST-EVENT',
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    uniqueKey: 'test',
  },
]

describe('EventWatcherSrv', () => {
  let eventWatcherSrv: EventWatcherSrv
  let logger: Logger
  let logs: Log[]

  beforeEach(() => {
    logger = { info: jest.fn(), debug: jest.fn() } as unknown as Logger
    logs = []
    eventWatcherSrv = new EventWatcherSrv('TestSrv', MOCK_EVENTS_LIST, logger)
  })

  it('returns empty array when no matching addresses', () => {
    logs = [{ address: '0x456' } as Log]

    const findings = eventWatcherSrv.handleLogs(logs)

    expect(findings).toEqual([])
  })

  it('returns empty array when no matching events', () => {
    const findings = eventWatcherSrv.handleLogs(logs)

    expect(findings).toEqual([])
  })

  it('returns findings when matching addresses and events', () => {
    const eventIndex = 0
    const value = '0x0000000000000000000000000000000000000000'
    const iface = new Interface([MOCK_EVENTS_LIST[eventIndex].event])
    const topics = iface.encodeFilterTopics('TestEvent', [value])

    const blockNumber = 100

    logs = [
      {
        address: MOCK_EVENTS_LIST[eventIndex].address,
        topics: topics as string[],
        data: '0x00000000000000000000000000000000000000000000000000000000000003e8',
        blockNumber,
        transactionHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        transactionIndex: 0,
        blockHash: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        logIndex: 0,
        removed: false,
      },
    ]

    const findings = eventWatcherSrv.handleLogs(logs)

    expect(findings).toEqual([
      Finding.fromObject({
        name: MOCK_EVENTS_LIST[eventIndex].name,
        description: MOCK_EVENTS_LIST[eventIndex].description(),
        alertId: MOCK_EVENTS_LIST[eventIndex].alertId,
        severity: FindingSeverity.Info,
        type: FindingType.Info,
        uniqueKey: getUniqueKey(MOCK_EVENTS_LIST[0].uniqueKey, blockNumber),
        metadata: { args: value },
      }),
    ])
  })
})
