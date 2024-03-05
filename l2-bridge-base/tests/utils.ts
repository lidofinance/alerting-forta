import { Block as EtherBlock } from '@ethersproject/abstract-provider'
import { Block, BlockEvent, EventType, Network } from 'forta-agent'
import { formatAddress } from 'forta-agent/dist/cli/utils'

export function etherBlockToFortaBlockEvent(block: EtherBlock): BlockEvent {
  const blok: Block = {
    difficulty: block.difficulty.toString(),
    extraData: block.extraData,
    gasLimit: block.gasLimit.toString(),
    gasUsed: block.gasUsed.toString(),
    hash: block.hash,
    logsBloom: '',
    miner: formatAddress(block.miner),
    mixHash: '',
    nonce: block.nonce,
    number: block.number,
    parentHash: block.parentHash,
    receiptsRoot: '',
    sha3Uncles: '',
    size: '',
    stateRoot: '',
    timestamp: block.timestamp,
    totalDifficulty: block.difficulty.toString(),
    transactions: block.transactions,
    transactionsRoot: '',
    uncles: [],
  }

  return new BlockEvent(EventType.BLOCK, Network.MAINNET, blok)
}
