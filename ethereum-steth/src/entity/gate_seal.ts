export type GateSeal = {
  roleForWithdrawalQueue: boolean
  roleForExitBus: boolean
  exitBusOracleAddress: string
  withdrawalQueueAddress: string
}

export const GateSealExpiredErr = new Error('GateSeal is expired')
