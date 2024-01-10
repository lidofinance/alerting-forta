import BigNumber from 'bignumber.js'

export class StethOperationCache {
  private _lastDepositorTxTime = 0
  private _lastBufferedEth = new BigNumber(0)
  private _criticalDepositableAmountTime = 0
  private _lastReportedDepositableEth = 0

  constructor() {}

  public getLastDepositorTxTime(): number {
    return this._lastDepositorTxTime
  }

  public setLastDepositorTxTime(value: number) {
    this._lastDepositorTxTime = value
  }

  public getLastBufferedEth(): BigNumber {
    return this._lastBufferedEth
  }

  public setLastBufferedEth(value: BigNumber) {
    this._lastBufferedEth = value
  }

  public getCriticalDepositableAmountTime(): number {
    return this._criticalDepositableAmountTime
  }

  public setCriticalDepositableAmountTime(blockTimestamp: number) {
    this._criticalDepositableAmountTime = blockTimestamp
  }

  public getLastReportedDepositableEth(): number {
    return this._lastReportedDepositableEth
  }

  public setLastReportedDepositableEth(blockTimestamp: number) {
    this._lastReportedDepositableEth = blockTimestamp
  }
}
