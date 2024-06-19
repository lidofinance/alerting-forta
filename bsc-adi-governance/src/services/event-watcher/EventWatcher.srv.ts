import { Finding, TransactionEvent } from 'forta-agent'
import { EventOfNotice } from '../../utils/constants'
import { Logger } from 'winston'
import { elapsedTime } from '../../utils/time'
import { filterLogs } from '../../utils/filter_logs'

export class EventWatcherSrv {
  private readonly name: string
  private readonly eventsToFinding: EventOfNotice[]
  private readonly logger: Logger

  constructor(botName: string, events: EventOfNotice[], logger: Logger) {
    this.name = botName
    this.eventsToFinding = events
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionEvent): Finding[] {
    const start = new Date().getTime()
    const findings: Finding[] = []

    this.eventsToFinding.forEach((eventInfo) => {
      if (eventInfo.address in txEvent.addresses) {
        const events = filterLogs(txEvent, eventInfo.event, eventInfo.address)
        events.forEach((event) => {
          findings.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(event.args),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: eventInfo.type,
              metadata: { args: String(event.args) },
            }),
          )
        })
      }
    })

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleTransaction.name, start))
    return findings
  }
}
