import { FindingSeverity, FindingType, ethers } from 'forta-agent'
import { Log } from '@ethersproject/abstract-provider'

export type EventOfNotice = {
  address: string
  event: string
  alertId: string
  name: string
  description: CallableFunction
  severity: FindingSeverity
  type: FindingType
}

export type TransactionDto = {
  logs: Log[]
  to: string | null
  block: {
    timestamp: number
    number: number
  }
}

export type LogDescription = ethers.utils.LogDescription
