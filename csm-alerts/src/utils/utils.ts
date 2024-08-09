import { Contract, EventFilter, Event } from 'ethers'

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
