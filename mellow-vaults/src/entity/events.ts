import { FindingSeverity, FindingType, Log } from 'forta-agent'

export type EventOfNotice = {
  name: string
  address: string
  event: string
  alertId: string
  description: CallableFunction
  severity: FindingSeverity
  type?: FindingType
  uniqueKey?: string
}

export type TransactionDtoTx = {
  data: string
  hash: string
}

export type TransactionDto = {
  logs: Log[]
  to: string | null
  block: {
    timestamp: number
    number: number
  }
  transaction: TransactionDtoTx
}

export type BlockDto = {
  number: number
  timestamp: number
  parentHash: string
}
