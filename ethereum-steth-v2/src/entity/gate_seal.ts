export type GateSeal = {
  roleForWithdrawalQueue: boolean
  roleForExitBus: boolean
  exitbusOracleAddress: string
  withdrawalQueueAddress: string
}

export const GateSealExpiredErr = new Error('GateSeal is expired')
