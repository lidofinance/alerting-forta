import { EventOfNotice } from '../entity/events'
import { Log } from '@ethersproject/abstract-provider'
import { filterLog, Finding } from 'forta-agent'
import { getUniqueKey } from '../utils/finding.helpers'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'

export class EventWatcher {
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

  public handleLogs(l2Logs: Log[]): Finding[] {
    const start = new Date().getTime()
    const addresses: string[] = []

    for (const l2Log of l2Logs) {
      addresses.push(l2Log.address.toLowerCase())
    }

    const findings: Finding[] = []
    for (const eventToFinding of this.eventsToFinding) {
      const ind = addresses.indexOf(eventToFinding.address)
      if (ind >= 0) {
        const filteredEvents = filterLog(l2Logs, eventToFinding.event, eventToFinding.address.toLowerCase())

        for (const event of filteredEvents) {
          findings.push(
            Finding.fromObject({
              name: eventToFinding.name,
              description: eventToFinding.description(event.args),
              alertId: eventToFinding.alertId,
              severity: eventToFinding.severity,
              type: eventToFinding.type,
              metadata: { args: String(event.args) },
              uniqueKey: getUniqueKey(eventToFinding.uniqueKey, l2Logs[ind].blockNumber),
            }),
          )
        }
      }
    }

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleLogs.name, start))
    return findings
  }
}
