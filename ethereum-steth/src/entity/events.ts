import { FindingSeverity, FindingType, Log, LogDescription } from 'forta-agent'

export type EventOfNotice = {
  name: string
  address: string
  event: string
  alertId: string
  description: CallableFunction
  severity: FindingSeverity
  type: FindingType
}

export type BlockDto = {
  timestamp: number
  number: number
  parentHash: string
}

export type BlockEventDto = {
  block: BlockDto
}

export type TransactionEventDto = {
  addresses: {
    [key: string]: boolean
  }
  logs: Log[]
  filterLog: (eventAbi: string | string[], contractAddress?: string | string[]) => LogDescription[]
  to: string | null
  timestamp: number
}
