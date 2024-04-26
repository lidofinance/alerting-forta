import { ethers, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { Log } from '@ethersproject/abstract-provider'

export type EventOfNotice = {
  name: string
  address: string
  abi: string
  alertId: string
  description: CallableFunction
  severity: FindingSeverity
  type: FindingType
}

export type BlockDto = {
  number: number
  timestamp: number
  parentHash: string
}

export type TransactionDto = {
  logs: Log[]
  to: string | null
  timestamp: number
  block: {
    timestamp: number
    number: number
  }
}

export function handleEventsOfNotice(txEvent: TransactionDto, eventsOfNotice: EventOfNotice[]): Finding[] {
  const out: Finding[] = []

  const addresses = new Set<string>()
  for (const eventOfNotice of eventsOfNotice) {
    addresses.add(eventOfNotice.address.toLowerCase())
  }

  for (const log of txEvent.logs) {
    if (addresses.has(log.address.toLowerCase())) {
      for (const eventInfo of eventsOfNotice) {
        const parser = new ethers.utils.Interface([eventInfo.abi])

        try {
          const logDesc = parser.parseLog(log)

          out.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(logDesc.args),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: eventInfo.type,
              metadata: { args: String(logDesc.args) },
            }),
          )
        } catch (e) {
          // Only one from eventsOfNotice could be correct
          // Others - skipping
        }
      }
    }
  }

  return out
}
