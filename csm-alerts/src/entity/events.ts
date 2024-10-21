import { Finding, TransactionEvent, ethers } from '@fortanetwork/forta-bot'

import { EventOfNotice } from '../shared/types'
import { sourceFromEvent } from '../utils/findings'

export function handleEventsOfNotice(
    txEvent: TransactionEvent,
    eventsOfNotice: EventOfNotice[],
): Finding[] {
    const out: Finding[] = []

    for (const log of txEvent.logs) {
        for (const eventInfo of eventsOfNotice) {
            if (log.address.toLowerCase() != eventInfo.address.toLowerCase()) {
                continue
            }

            const parser = new ethers.Interface(
                typeof eventInfo.abi === 'string' ? [eventInfo.abi] : eventInfo.abi,
            )
            const logDesc = parser.parseLog(log)
            if (!logDesc) {
                continue
            }

            const f = Finding.fromObject({
                name: eventInfo.name,
                description: eventInfo.description(logDesc.args),
                alertId: eventInfo.alertId,
                severity: eventInfo.severity,
                type: eventInfo.type,
                source: sourceFromEvent(txEvent),
                addresses: Object.keys(txEvent.addresses),
                metadata: { args: String(logDesc.args) },
            })

            out.push(f)
        }
    }

    return out
}
