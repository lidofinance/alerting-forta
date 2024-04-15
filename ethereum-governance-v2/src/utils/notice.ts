import { Finding, FindingType, Log, LogDescription } from 'forta-agent'
import { EventArgs } from './constants/stonks/mainnet'
import { Result } from '@ethersproject/abi'
import { EventOfNotice } from '../entity/events'

export type TransactionEventContract = {
  addresses: {
    [key: string]: boolean
  }
  logs: Log[]
  filterLog: (eventAbi: string | string[], contractAddress?: string | string[]) => LogDescription[]
  to: string | null
  timestamp: number
}

export function handleEventsOfNotice(txEvent: TransactionEventContract, eventsOfNotice: EventOfNotice[]) {
  const out: Finding[] = []
  for (const eventInfo of eventsOfNotice) {
    if (!(eventInfo.address.toLowerCase() in txEvent.addresses)) {
      continue
    }
    const filteredEvents = txEvent.filterLog(eventInfo.event, eventInfo.address)
    for (const filteredEvent of filteredEvents) {
      out.push(
        Finding.fromObject({
          name: eventInfo.name,
          description: eventInfo.description(logArgsToEventArgs(filteredEvent.args)),
          alertId: eventInfo.alertId,
          severity: eventInfo.severity,
          type: FindingType.Info,
          metadata: { args: String(filteredEvent.args) },
        }),
      )
    }
  }

  return out
}

export function logArgsToEventArgs(args: Result): EventArgs {
  return {
    manager: args.manager,
    address: args.address,
    recipient: args.recipient,
    token: args.token,
    tokenId: args.tokenId,
    amount: args.amount,
    orderContract: args.orderContract,
    minBuyAmount: args.minBuyAmount,
  }
}
