import { Logger } from 'winston'
import { Log } from '@ethersproject/abstract-provider'
import { filterLog, Finding } from 'forta-agent'
import { EventOfNotice } from '../entity/events'
import { getUniqueKey } from '../utils/finding.helpers'
import { elapsedTime } from '../utils/time'


export class EventWatcher {
  private readonly eventsToFinding: EventOfNotice[]
  private readonly logger: Logger

  constructor(events: EventOfNotice[], logger: Logger) {
    this.eventsToFinding = events
    this.logger = logger
  }

  public handleLogs(logs: Log[]): Finding[] {
    const start = new Date().getTime()
    const addresses: string[] = []

    for (const log of logs) {
      addresses.push(log.address)
    }

    const findings: Finding[] = []
    for (const eventToFinding of this.eventsToFinding) {
      const ind = addresses.indexOf(eventToFinding.address)
      if (ind >= 0) {
        const filteredEvents = filterLog(logs, eventToFinding.event, eventToFinding.address)
        for (const event of filteredEvents) {
          findings.push(Finding.fromObject({
            name: eventToFinding.name,
            description: eventToFinding.description(event.args),
            alertId: eventToFinding.alertId,
            severity: eventToFinding.severity,
            type: eventToFinding.type,
            metadata: { args: String(event.args) },
            uniqueKey: getUniqueKey(eventToFinding.uniqueKey, logs[ind].blockNumber),
          }))
        }
      }
    }

    this.logger.info(elapsedTime(EventWatcher.name + '.' + this.handleLogs.name, start))
    return findings
  }
}
