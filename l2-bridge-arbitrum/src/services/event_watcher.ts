import { EventOfNotice } from '../entity/events'
import { Log } from '@ethersproject/abstract-provider'
import { ethers } from 'ethers'
import { Finding } from '../generated/proto/alert_pb'
import { GATEWAY_SET_EVENT } from '../utils/events/router_events'

export class EventWatcher {
  private readonly name: string
  private readonly eventsToFinding: EventOfNotice[]
  private readonly l1WstEthAddress: string

  constructor(botName: string, events: EventOfNotice[], l1WstEthAddress: string) {
    this.name = botName
    this.eventsToFinding = events
    this.l1WstEthAddress = l1WstEthAddress
  }

  public getName(): string {
    return this.name
  }

  public handleLogs(logs: Log[]): Finding[] {
    const addressToLogs = new Map<string, Log[]>()

    for (const log of logs) {
      if (addressToLogs.has(log.address.toLowerCase())) {
        // @ts-ignore
        const logsInMap: Log[] = addressToLogs.get(log.address.toLowerCase())
        logsInMap.push(log)
        addressToLogs.set(log.address.toLowerCase(), logsInMap)
      } else {
        addressToLogs.set(log.address.toLowerCase(), [log])
      }
    }

    const findings: Finding[] = []
    for (const eventToFinding of this.eventsToFinding) {
      if (addressToLogs.has(eventToFinding.address.toLowerCase())) {
        // @ts-ignore
        const logs: Log[] = addressToLogs.get(eventToFinding.address.toLowerCase())

        for (const log of logs) {
          const parser = new ethers.utils.Interface([eventToFinding.event])
          try {
            const logDesc = parser.parseLog(log)

            if (eventToFinding.event === GATEWAY_SET_EVENT && logDesc.args.l1Token !== this.l1WstEthAddress) {
              continue
            }

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
