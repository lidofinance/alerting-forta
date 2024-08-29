import { Contract, ContractEventName, EventLog } from 'ethers'

const LOG_FILTER_CHUNK = 2000

export async function getLogsByChunks(
  contract: Contract,
  event: ContractEventName,
  startblock: number,
  endBlock: number,
): Promise<EventLog[]> {
  const events: EventLog[] = []
  let endBlockChunk
  let startBlockChunk = startblock
  do {
    endBlockChunk =
      endBlock > startBlockChunk + LOG_FILTER_CHUNK - 1 ? startBlockChunk + LOG_FILTER_CHUNK - 1 : endBlock
    const eventsChunk = await contract.queryFilter(event, startBlockChunk, endBlockChunk)
    events.push(...eventsChunk.map((event) => event as EventLog))
    startBlockChunk = endBlockChunk + 1
  } while (endBlockChunk < endBlock)
  return events
}
