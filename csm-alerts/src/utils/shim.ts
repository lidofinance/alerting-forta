import {
    BlockEvent as BlockEventV2,
    Finding as FindingV2,
    TransactionEvent as TransactionEventV2,
} from '@fortanetwork/forta-bot'
import {
    BlockEvent as BlockEventV1,
    Finding as FindingV1,
    TransactionEvent as TransactionEventV1,
} from 'forta-agent'

import { BlockEvent } from '../shared/nats'

export function blockEventV1toV2(blockEvent: BlockEventV1, chainId: number = 1): BlockEventV2 {
    return new BlockEventV2(chainId, blockEvent.block)
}

export function onchainMonBlockToBlockEventV2(
    blockEvent: BlockEvent,
    chainId: number = 1,
): BlockEventV2 {
    return new BlockEventV2(chainId, {
        difficulty: '',
        extraData: '',
        gasLimit: '',
        gasUsed: '',
        hash: blockEvent.hash,
        logsBloom: '',
        miner: '',
        mixHash: '',
        nonce: '',
        number: blockEvent.number,
        parentHash: blockEvent.parentHash,
        receiptsRoot: '',
        sha3Uncles: '',
        size: '',
        stateRoot: '',
        timestamp: blockEvent.timestamp,
        totalDifficulty: '',
        transactions: blockEvent.receipts.map((r) => r.transactionHash),
        transactionsRoot: '',
        uncles: [],
    })
}

export function onchainMonBlockToListTransactionEventV2(
    blockEvent: BlockEvent,
    chainId: number = 1,
): TransactionEventV2[] {
    const { hash: blockHash, number: blockNumber, timestamp } = blockEvent

    return blockEvent.receipts.map(({ from, logs, to, transactionHash }) => {
        const addresses: Record<string, true> = { [from]: true }
        if (to) addresses[to] = true

        return new TransactionEventV2(
            chainId,
            {
                hash: transactionHash,
                from,
                to: to ?? null,
                nonce: -1, // unknown
                gas: '',
                gasPrice: '',
                value: '',
                data: '',
                r: '',
                s: '',
                v: '',
            },
            [], // traces
            addresses,
            {
                hash: blockHash,
                number: blockNumber,
                timestamp,
            },
            logs,
            null, // TODO: resolve create‑address once needed
        )
    })
}

export function txEventV1toV2(
    txEvent: TransactionEventV1,
    chainId: number = 1,
): TransactionEventV2 {
    return new TransactionEventV2(
        chainId,
        txEvent.transaction,
        [], // traces
        txEvent.addresses,
        txEvent.block,
        txEvent.logs,
        txEvent.contractAddress,
    )
}

export function findingV2toV1(finding: FindingV2): FindingV1 {
    return FindingV1.fromObject({
        ...finding,
        labels: [],
    })
}
