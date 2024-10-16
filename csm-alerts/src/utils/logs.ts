import { ethers } from '@fortanetwork/forta-bot'

const LOG_FILTER_CHUNK = 2000

export async function getLogsByChunks(
    contract: ethers.BaseContract,
    filter: ethers.ContractEventName,
    startblock: number,
    endBlock: number,
) {
    const events: ethers.Log[] = []
    let endBlockChunk
    let startBlockChunk = startblock
    do {
        endBlockChunk =
            endBlock > startBlockChunk + LOG_FILTER_CHUNK - 1
                ? startBlockChunk + LOG_FILTER_CHUNK - 1
                : endBlock
        const eventsChunk = await contract.queryFilter(filter, startBlockChunk, endBlockChunk)
        events.push(...eventsChunk)
        startBlockChunk = endBlockChunk + 1
    } while (endBlockChunk < endBlock)
    return events
}
