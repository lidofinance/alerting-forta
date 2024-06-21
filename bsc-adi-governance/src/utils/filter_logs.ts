import { ethers } from 'forta-agent'
import { LogDescription, TransactionDto } from './types'

export function filterLogs(txEvent: TransactionDto, eventSignature: string, eventAddress: string): LogDescription[] {
  const iface = new ethers.utils.Interface([eventSignature])
  const filteredLogs: LogDescription[] = []

  for (const log of txEvent.logs) {
    if (log.address.toLowerCase() !== eventAddress.toLowerCase()) {
      continue
    }

    try {
      const logDescription = iface.parseLog(log)
      filteredLogs.push(logDescription)
    } catch (e) {
      // Only one from eventsOfNotice could be correct
      // Others - skipping
    }
  }

  return filteredLogs
}
