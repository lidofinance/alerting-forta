import { Block as EtherBlock } from '@ethersproject/abstract-provider'
import { Block, BlockEvent, EventType, Network, Trace } from 'forta-agent'
import { formatAddress, isZeroAddress } from 'forta-agent/dist/cli/utils'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { getContractAddress } from 'ethers/lib/utils'
import { JsonRpcBlock, JsonRpcTransaction } from 'forta-agent/dist/cli/utils/get.block.with.transactions'
import { JsonRpcLog } from 'forta-agent/dist/cli/utils/get.transaction.receipt'

export function etherBlockToFortaBlockEvent(block: EtherBlock): BlockEvent {
  const blok: Block = {
    difficulty: block.difficulty !== null ? block.difficulty.toString() : '',
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
    totalDifficulty: block.difficulty !== null ? block.difficulty.toString() : '',
    transactions: block.transactions,
    transactionsRoot: '',
    uncles: [],
  }

  return new BlockEvent(EventType.BLOCK, Network.MAINNET, blok)
}

export function createTransactionEvent(
  transaction: JsonRpcTransaction,
  block: JsonRpcBlock,
  networkId: number,
  traces: Trace[] = [],
  logs: JsonRpcLog[] = [],
): TransactionEvent {
  const tx = {
    hash: transaction.hash,
    from: formatAddress(transaction.from),
    to: transaction.to ? formatAddress(transaction.to) : null,
    nonce: parseInt(transaction.nonce),
    gas: transaction.gas,
    gasPrice: transaction.gasPrice,
    value: transaction.value,
    data: transaction.input,
    r: transaction.r,
    s: transaction.s,
    v: transaction.v,
  }
  const addresses = {
    [tx.from]: true,
  }
  if (tx.to) {
    addresses[tx.to] = true
  }

  const blok = {
    hash: block.hash,
    number: parseInt(block.number),
    timestamp: parseInt(block.timestamp),
  }

  const trcs: Trace[] = []
  traces.forEach((trace) => {
    if (trace.action.address) {
      addresses[formatAddress(trace.action.address)] = true
    }
    if (trace.action.refundAddress) {
      addresses[formatAddress(trace.action.refundAddress)] = true
    }
    addresses[formatAddress(trace.action.to)] = true
    addresses[formatAddress(trace.action.from)] = true

    trcs.push({
      action: {
        callType: trace.action.callType,
        to: formatAddress(trace.action.to),
        input: trace.action.input,
        from: formatAddress(trace.action.from),
        value: trace.action.value,
        init: trace.action.init,
        address: formatAddress(trace.action.address),
        balance: trace.action.balance,
        refundAddress: formatAddress(trace.action.refundAddress),
      },
      blockHash: trace.blockHash,
      blockNumber: trace.blockNumber,
      result: {
        gasUsed: trace.result?.gasUsed,
        address: trace.result?.address,
        code: trace.result?.code,
        output: trace.result?.output,
      },
      subtraces: trace.subtraces,
      traceAddress: trace.traceAddress,
      transactionHash: trace.transactionHash,
      transactionPosition: trace.transactionPosition,
      type: trace.type,
      error: trace.error,
    })
  })

  const lgs = logs.map((log) => ({
    address: formatAddress(log.address),
    topics: log.topics,
    data: log.data,
    logIndex: parseInt(log.logIndex),
    blockNumber: parseInt(log.blockNumber),
    blockHash: log.blockHash,
    transactionIndex: parseInt(log.transactionIndex),
    transactionHash: log.transactionHash,
    removed: log.removed,
  }))
  lgs.forEach((log) => (addresses[log.address] = true))

  let contractAddress = null
  if (isZeroAddress(transaction.to)) {
    contractAddress = formatAddress(getContractAddress({ from: transaction.from, nonce: transaction.nonce }))
  }

  return new TransactionEvent(EventType.BLOCK, networkId, tx, trcs, addresses, blok, lgs, contractAddress)
}
