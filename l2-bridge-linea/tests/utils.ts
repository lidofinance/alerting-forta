import { Block as EtherBlock } from '@ethersproject/abstract-provider'
import { Block, BlockEvent, EventType, Network, Trace } from 'forta-agent'
import { formatAddress, isZeroAddress } from 'forta-agent/dist/cli/utils'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { getContractAddress } from 'ethers/lib/utils'
import { JsonRpcBlock, JsonRpcTransaction } from 'forta-agent/dist/cli/utils/get.block.with.transactions'
import { JsonRpcLog } from 'forta-agent/dist/cli/utils/get.transaction.receipt'

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
