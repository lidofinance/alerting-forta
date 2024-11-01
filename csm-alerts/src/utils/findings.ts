import {
    BlockEvent,
    Finding,
    FindingSeverity,
    FindingType,
    TransactionEvent,
} from '@fortanetwork/forta-bot'
import { FindingSource } from '@fortanetwork/forta-bot/dist/findings/finding.source'

import { toKebabCase } from './string'
import { APP_NAME } from '../config'
import Version from './version'

export function sourceFromEvent(event: TransactionEvent | BlockEvent): FindingSource {
    const source: FindingSource = {}

    if ('transaction' in event)
        source.transactions = [{ chainId: event.chainId, hash: event.transaction.hash }]
    source.blocks = [{ chainId: event.chainId, hash: event.block.hash, number: event.block.number }]

    return source
}

export function launchAlert(): Finding {
    return Finding.fromObject({
        name: `🚀🚀🚀 Bot ${APP_NAME} launched`,
        description: `Commit ${Version.commitHashShort}`,
        alertId: 'LIDO-AGENT-LAUNCHED',
        severity: FindingSeverity.Info,
        type: FindingType.Info,
    })
}

export function invariantAlert(event: BlockEvent | TransactionEvent, message: string): Finding {
    return Finding.fromObject({
        name: '🚨 Assert invariant failed',
        description: message,
        alertId: 'ASSERT-FAILED',
        source: sourceFromEvent(event),
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
    })
}

export function errorAlert(name: string, err: string | Error | undefined): Finding {
    return Finding.fromObject({
        name: name,
        description: String(err),
        alertId: 'CODE-ERROR',
        severity: FindingSeverity.Unknown,
        type: FindingType.Degraded,
        metadata: {
            stack: `${err instanceof Error ? err.stack : null}`,
            message: `${err instanceof Error ? err.message : null}`,
            name: `${err instanceof Error ? err.name : null}`,
        },
    })
}
