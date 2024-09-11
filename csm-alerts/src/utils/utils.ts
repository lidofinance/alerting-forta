import { Contract, EventFilter, Event } from 'ethers'
import { Finding } from '../../generated/proto/alert_pb'

const LOG_FILTER_CHUNK = 2000

export async function getLogsByChunks(contract: Contract, filter: EventFilter, startblock: number, endBlock: number) {
  const events: Event[] = []
  let endBlockChunk
  let startBlockChunk = startblock
  do {
    endBlockChunk =
      endBlock > startBlockChunk + LOG_FILTER_CHUNK - 1 ? startBlockChunk + LOG_FILTER_CHUNK - 1 : endBlock
    const eventsChunk = await contract.queryFilter(filter, startBlockChunk, endBlockChunk)
    events.push(...eventsChunk)
    startBlockChunk = endBlockChunk + 1
  } while (endBlockChunk < endBlock)
  return events
}

export function assertInvariant(condition: boolean, message: string) {
  const out: Finding[] = []

  if (condition) {
    const f = new Finding()
    f.setName('🚨 Assert invariant failed')
    f.setDescription(`${message}`)
    f.setAlertid('ASSERT-FAILED')
    f.setSeverity(Finding.Severity.CRITICAL)
    f.setType(Finding.FindingType.INFORMATION)
    f.setProtocol('ethereum')

    out.push(f)
  }
}
