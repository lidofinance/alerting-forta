import BigNumber from 'bignumber.js'

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
