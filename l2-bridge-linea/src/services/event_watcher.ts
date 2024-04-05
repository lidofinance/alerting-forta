import { EventOfNotice } from '../entity/events'
import { Log } from '@ethersproject/abstract-provider'
import { filterLog, Finding } from 'forta-agent'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { getUniqueKey } from '../utils/finding.helpers'
import { formatAddress } from 'forta-agent/dist/cli/utils'

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

  handleLogs(logs: Log[]): Finding[] {
    const start = new Date().getTime()
    const addresses: string[] = []

    for (const log of logs) {
      addresses.push(log.address)
    }

    const findings: Finding[] = []
    for (const eventToFinding of this.eventsToFinding) {
      const ind = addresses.indexOf(formatAddress(eventToFinding.address))
      if (ind >= 0) {
        const filteredEvents = filterLog(logs, eventToFinding.event, eventToFinding.address)

        for (const event of filteredEvents) {
          findings.push(
            Finding.fromObject({
              name: eventToFinding.name,
              description: eventToFinding.description(event.args),
              alertId: eventToFinding.alertId,
              severity: eventToFinding.severity,
              type: eventToFinding.type,
              metadata: { args: String(event.args) },
              uniqueKey: getUniqueKey(eventToFinding.uniqueKey, logs[ind].blockNumber),
            }),
          )
        }
      }
    }

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleLogs.name, start))
    return findings
  }
}
