import { EventOfNotice } from '../entity/events'
import { Log } from '@ethersproject/abstract-provider'
import { ethers } from 'ethers'
import { Finding } from '../generated/proto/alert_pb'

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

  public handleL2Logs(l2logs: Log[]): Finding[] {
    const addresses: string[] = []

    for (const l2log of l2logs) {
      addresses.push(l2log.address.toLowerCase())
    }

    const findings: Finding[] = []
    for (const eventToFinding of this.eventsToFinding) {
      const ind = addresses.indexOf(eventToFinding.address)
      if (ind >= 0) {
        for (const log of l2logs) {
          if (log.address.toLowerCase() !== eventToFinding.address.toLowerCase()) {
            continue
          }

          const parser = new ethers.utils.Interface([eventToFinding.event])
          try {
            const logDesc = parser.parseLog(log)
            const f: Finding = new Finding()

            f.setName(eventToFinding.name)
            f.setDescription(eventToFinding.description(logDesc.args))
            f.setAlertid(eventToFinding.alertId)
            f.setSeverity(eventToFinding.severity)
            f.setType(eventToFinding.type)
            f.setProtocol('ethereum')
            f.setUniquekey(log.blockNumber.toString())

            const m = f.getMetadataMap()
            m.set('args', String(logDesc.args))

            findings.push(f)
          } catch (e) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          }
        }
      }
    }

    return findings
  }
}
