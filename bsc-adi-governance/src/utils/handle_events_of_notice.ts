import { Finding, FindingType } from 'forta-agent'
import { EventOfNotice, TransactionDto } from './types'
import { filterLogs } from './filter_logs'

export function handleEventsOfNotice(txEvent: TransactionDto, eventsOfNotice: EventOfNotice[]) {
  const findings: Finding[] = []

  for (const eventInfo of eventsOfNotice) {
    const filteredLogs = filterLogs(txEvent, eventInfo.event, eventInfo.address)
    for (const filteredLog of filteredLogs) {
      findings.push(
        Finding.fromObject({
          name: eventInfo.name,
          description: eventInfo.description(filteredLog.args),
          alertId: eventInfo.alertId,
          severity: eventInfo.severity,
          type: FindingType.Info,
          metadata: { args: String(filteredLog.args) },
        }),
      )
    }
  }

  return findings
}
