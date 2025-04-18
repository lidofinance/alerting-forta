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

export function blockEventV1toV2(
    blockEvent: BlockEventV1,
    chainId: number | undefined,
): BlockEventV2 {
    return new BlockEventV2(chainId ?? 1, blockEvent.block)
}

export function onchainMonBlockToBlockEventV2(
    blockEvent: BlockEvent,
    chainId: number | undefined,
): BlockEventV2 {
    return new BlockEventV2(chainId ?? 1, {
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
    chainId: number | undefined,
) {
    return blockEvent.receipts.map(
        ({ from, logs, to, transactionHash }) =>
            new TransactionEventV2(
                chainId ?? 1,
                {
                    hash: transactionHash,
                    from: from,
                    to: to ?? null,
                    nonce: -1,
                    gas: '',
                    gasPrice: '',
                    value: '',
                    data: '',
                    r: '',
                    s: '',
                    v: '',
                },
                [], // traces
                (() => {
                    const addresses = { [from]: true }
                    if (to) addresses[to] = true
                    return addresses
                })(), // addresses
                {
                    hash: blockEvent.hash,
                    number: blockEvent.number,
                    timestamp: blockEvent.timestamp,
                },
                logs,
                null, // TODO: use getCreateAddress from 'ethers'
            ),
    )
}

export function txEventV1toV2(
    txEvent: TransactionEventV1,
    chainId: number | undefined,
): TransactionEventV2 {
    return new TransactionEventV2(
        chainId ?? 1,
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
