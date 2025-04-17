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

import { BlockEvent, Receipt } from '../shared/nats'

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
        transactions: blockEvent.receipts.map(receiptToTxHash),
        transactionsRoot: '',
        uncles: [],
    })
}

export function onchainMonBlockToListTransactionEventV2(
    blockEvent: BlockEvent,
    chainId: number | undefined,
) {
    return blockEvent.receipts.map(
        (r) =>
            new TransactionEventV2(
                chainId ?? 1,
                {
                    hash: receiptToTxHash(r),
                    from: 'fixme',
                    to: r.to ?? null,
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
                {}, // addresses, not really used in the bot
                {
                    hash: blockEvent.hash,
                    number: blockEvent.number,
                    timestamp: blockEvent.timestamp,
                },
                r.logs,
                null, // @see https://github.com/forta-network/forta-bot-sdk-v2/blob/1b63a9b81681b2db147e1ee7416404293b4cd735/ts-sdk/src/transactions/create.transaction.event.ts#L102-L106
            ),
    )
}

function receiptToTxHash(r: Receipt) {
    return r.logs[0]?.transactionHash ?? 'undefined'
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
