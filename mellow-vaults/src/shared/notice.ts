import { Finding, FindingType, TransactionEvent } from 'forta-agent'
import { EventOfNotice } from '../entity/events'

export function handleEventsOfNotice(txEvent: TransactionEvent, eventsOfNotice: EventOfNotice[]) {
  const out: Finding[] = []
  for (const eventInfo of eventsOfNotice) {
    if (!(eventInfo.address.toLowerCase() in txEvent.addresses)) {
      continue
    }
    const filteredEvents = txEvent.filterLog(eventInfo.event, eventInfo.address)
    for (const filteredEvent of filteredEvents) {
      out.push(
        Finding.fromObject({
          name: eventInfo.name,
          description: eventInfo.description(filteredEvent.args),
          alertId: eventInfo.alertId,
          severity: eventInfo.severity,
          type: FindingType.Info,
          metadata: { args: String(filteredEvent.args) },
        }),
      )
    }
  }

  return out
}
