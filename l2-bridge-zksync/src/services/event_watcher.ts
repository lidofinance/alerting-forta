import { EventOfNotice } from '../entity/events'
import { Log } from '@ethersproject/abstract-provider'
import { filterLog, Finding } from 'forta-agent'
import { getUniqueKey } from '../utils/finding.helpers'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import BigNumber from 'bignumber.js'

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

  public handleL2Logs(l2Logs: Log[]): Finding[] {
    const start = new Date().getTime()
    const addresses = new Set<string>()
    const logIndexToLog = new Map<number, Log>()

    for (const l2Log of l2Logs) {
      addresses.add(l2Log.address.toLowerCase())
      logIndexToLog.set(l2Log.logIndex, l2Log)
    }

    const findings: Finding[] = []
    for (const eventToFinding of this.eventsToFinding) {
      if (addresses.has(eventToFinding.address.toLowerCase())) {
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
              uniqueKey: getUniqueKey(
                eventToFinding.uniqueKey,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                new BigNumber(logIndexToLog.get(event.logIndex).blockNumber, 10).toNumber(),
              ),
            }),
          )
        }
      }
    }

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleL2Logs.name, start))
    return findings
  }
}
