import { Finding, FindingType, ethers } from 'forta-agent'
import { EventOfNotice, TransactionDto } from '../entity/events'

export function handleEventsOfNotice(
  txEvent: TransactionDto,
  events: string[],
  address: string,
  notices: Record<string, EventOfNotice>,
) {
  const iface = new ethers.utils.Interface(events)
  const out: Finding[] = []

  for (const log of txEvent.logs) {
    if (log.address.toLowerCase() !== address.toLowerCase()) {
      continue
    }

    try {
      const event = iface.parseLog(log)
      const notice = notices[event.name]
      if (notice) {
        const finding = Finding.fromObject({
          name: notice.name,
          description: notice.description(event.args, address, txEvent.transaction),
          alertId: notice.alertId,
          severity: notice.severity,
          type: notice.type ?? FindingType.Info,
          metadata: { args: String(event.args) },
          uniqueKey: notice.uniqueKey ?? '',
        })
        out.push(finding)
      } else {
        console.error(`No notices for event ${event.name} in notices list (${Object.keys(notices).join(', ')})`)
      }
    } catch (e) {
      const x = e as { reason: string }
      if (x?.reason === 'no matching event') {
        console.log(e)
      } else {
        console.error(e)
      }
      // Only one from eventsOfNotice could be correct
      // Others - skipping
    }
  }

  return out
}