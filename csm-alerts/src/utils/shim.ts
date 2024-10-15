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

export function blockEventV1toV2(
    blockEvent: BlockEventV1,
    chainId: number | undefined,
): BlockEventV2 {
    return new BlockEventV2(chainId ?? 1, blockEvent.block)
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
