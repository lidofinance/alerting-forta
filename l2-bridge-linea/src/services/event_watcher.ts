import { EventOfNotice } from '../entity/events'
import { Log } from '@ethersproject/abstract-provider'
import { filterLog, Finding } from 'forta-agent'

export class EventWatcher {
  private readonly name: string
  private readonly eventsToFinding: EventOfNotice[]

  constructor(botName: string, events: EventOfNotice[]) {
    this.name = botName
    this.eventsToFinding = events
  }

  public getName(): string {
    return this.name
  }

  handleLogs(logs: Log[]): Finding[] {
    const addresses: string[] = []

    for (const log of logs) {
      addresses.push(log.address)
    }

    const findings: Finding[] = []
    for (const eventToFinding of this.eventsToFinding) {
      if (eventToFinding.address in addresses) {
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
              uniqueKey: eventToFinding.uniqueKey,
            }),
          )
        }
      }
    }

    return findings
  }
}
