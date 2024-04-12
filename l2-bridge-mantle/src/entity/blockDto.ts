import BigNumber from 'bignumber.js'

export type BlockDto = {
  number: number
  timestamp: number
}

export type WithdrawalRecord = {
  timestamp: number
  amount: BigNumber
}
