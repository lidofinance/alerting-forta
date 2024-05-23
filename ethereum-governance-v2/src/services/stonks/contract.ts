export type CreatedOrder = {
  tokenFrom: string
  address: string
  orderDuration: number
  timestamp: number
  active: boolean
}

export type EventArgs = {
  manager: string
  address: string
  recipient: string
  token: string
  tokenId: number
  amount: string
  orderContract: string
  minBuyAmount: string
}
