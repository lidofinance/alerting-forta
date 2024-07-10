import BigNumber from 'bignumber.js'
import { Log } from '@ethersproject/abstract-provider'

export type BlockDto = {
  number: number
  timestamp: number
  parentHash: string
  hash: string
}

export type WithdrawalRecord = {
  timestamp: number
  amount: BigNumber
}

export type BlockDtoWithTransactions = {
  number: number
  timestamp: number
  parentHash: string
  hash: string
  transactions: TransactionDto[]
}

export type TransactionDto = {
  logs: Log[]
  to: string | null
  block: {
    timestamp: number
    number: number
  }
}

export type BlockHash = string
