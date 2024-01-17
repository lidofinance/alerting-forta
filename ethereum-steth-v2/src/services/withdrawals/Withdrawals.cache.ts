import BigNumber from 'bignumber.js'

export type WithdrawalRequest = {
  id: number
  amount: BigNumber | undefined
  claimed: boolean
  timestamp: string
}

export class WithdrawalsCache {
  private _bunkerModeEnabledSinceTimestamp = 0
  private _isBunkerMode = false
  private _lastFinalizedRequestId = 0
  private _lastFinalizedTimestamp = 0
  private _firstUnfinalizedRequestTimestamp: number
  private readonly _finalizedWithdrawalRequestsMap: Map<number, WithdrawalRequest>

  private _lastQueueOnParStakeLimitAlertTimestamp = 0
  private _lastBigUnfinalizedQueueAlertTimestamp = 0
  private _lastLongUnfinalizedQueueAlertTimestamp = 0
  private _lastUnclaimedRequestsAlertTimestamp = 0
  private _lastUnclaimedMoreThanBalanceAlertTimestamp = 0
  private _lastBigRequestAfterRebaseAlertTimestamp = 0
  private _lastTokenRebaseTimestamp = 0
  private _lastClaimedAmountMoreThanRequestedAlertTimestamp = 0
  private _claimedAmountMoreThanRequestedAlertsCount = 0

  private _amountOfRequestedStETHSinceLastTokenRebase = new BigNumber(0)

  constructor() {
    this._finalizedWithdrawalRequestsMap = new Map<number, WithdrawalRequest>()
    this._firstUnfinalizedRequestTimestamp = 0
  }

  public getBunkerModeEnabledSinceTimestamp(): number {
    return this._bunkerModeEnabledSinceTimestamp
  }

  public setBunkerModeEnabledSinceTimestamp(blockTimestamp: number) {
    this._bunkerModeEnabledSinceTimestamp = blockTimestamp
  }

  public getIsBunkerMode(): boolean {
    return this._isBunkerMode
  }

  public setIsBunkerMode(isBunkerMode: boolean) {
    this._isBunkerMode = isBunkerMode
  }

  public getLastFinalizedRequestId(): number {
    return this._lastFinalizedRequestId
  }

  public setLastFinalizedRequestId(lastFinalizedRequestId: number) {
    this._lastFinalizedRequestId = lastFinalizedRequestId
  }

  public getLastFinalizedTimestamp(): number {
    return this._lastFinalizedTimestamp
  }

  public setLastFinalizedTimestamp(lastFinalizedTimestamp: number) {
    this._lastFinalizedTimestamp = lastFinalizedTimestamp
  }

  public getFinalizedWithdrawalRequestsMap(): Map<number, WithdrawalRequest> {
    return this._finalizedWithdrawalRequestsMap
  }

  public getFirstUnfinalizedRequestTimestamp(): number {
    return this._firstUnfinalizedRequestTimestamp
  }

  public setFirstUnfinalizedRequestTimestamp(firstUnfinalizedRequestTimestamp: number) {
    this._firstUnfinalizedRequestTimestamp = firstUnfinalizedRequestTimestamp
  }

  public getLastQueueOnParStakeLimitAlertTimestamp(): number {
    return this._lastQueueOnParStakeLimitAlertTimestamp
  }

  public setLastQueueOnParStakeLimitAlertTimestamp(lastQueueOnParStakeLimitAlertTimestamp: number) {
    this._lastQueueOnParStakeLimitAlertTimestamp = lastQueueOnParStakeLimitAlertTimestamp
  }

  public getLastBigUnfinalizedQueueAlertTimestamp(): number {
    return this._lastBigUnfinalizedQueueAlertTimestamp
  }

  public setLastBigUnfinalizedQueueAlertTimestamp(lastBigUnfinalizedQueueAlertTimestamp: number) {
    this._lastBigUnfinalizedQueueAlertTimestamp = lastBigUnfinalizedQueueAlertTimestamp
  }

  public getLastLongUnfinalizedQueueAlertTimestamp(): number {
    return this._lastLongUnfinalizedQueueAlertTimestamp
  }

  public setLastLongUnfinalizedQueueAlertTimestamp(lastLongUnfinalizedQueueAlertTimestamp: number) {
    this._lastLongUnfinalizedQueueAlertTimestamp = lastLongUnfinalizedQueueAlertTimestamp
  }

  public getLastUnclaimedRequestsAlertTimestamp(): number {
    return this._lastUnclaimedRequestsAlertTimestamp
  }

  public setLastUnclaimedRequestsAlertTimestamp(lastUnclaimedRequestsAlertTimestamp: number) {
    this._lastUnclaimedRequestsAlertTimestamp = lastUnclaimedRequestsAlertTimestamp
  }

  public getLastUnclaimedMoreThanBalanceAlertTimestamp(): number {
    return this._lastUnclaimedMoreThanBalanceAlertTimestamp
  }

  public setLastUnclaimedMoreThanBalanceAlertTimestamp(lastUnclaimedMoreThanBalanceAlertTimestamp: number) {
    this._lastUnclaimedMoreThanBalanceAlertTimestamp = lastUnclaimedMoreThanBalanceAlertTimestamp
  }

  public getAmountOfRequestedStETHSinceLastTokenRebase(): BigNumber {
    return this._amountOfRequestedStETHSinceLastTokenRebase
  }

  public setAmountOfRequestedStETHSinceLastTokenRebase(amountOfRequestedStETHSinceLastTokenRebase: BigNumber) {
    this._amountOfRequestedStETHSinceLastTokenRebase = amountOfRequestedStETHSinceLastTokenRebase
  }

  public getLastBigRequestAfterRebaseAlertTimestamp(): number {
    return this._lastBigRequestAfterRebaseAlertTimestamp
  }

  public setLastBigRequestAfterRebaseAlertTimestamp(lastBigRequestAfterRebaseAlertTimestamp: number) {
    this._lastBigRequestAfterRebaseAlertTimestamp = lastBigRequestAfterRebaseAlertTimestamp
  }

  public getLastTokenRebaseTimestamp(): number {
    return this._lastTokenRebaseTimestamp
  }

  public setLastTokenRebaseTimestamp(lastTokenRebaseTimestamp: number) {
    this._lastTokenRebaseTimestamp = lastTokenRebaseTimestamp
  }

  public getLastClaimedAmountMoreThanRequestedAlertTimestamp(): number {
    return this._lastClaimedAmountMoreThanRequestedAlertTimestamp
  }

  public setLastClaimedAmountMoreThanRequestedAlertTimestamp(lastClaimedAmountMoreThanRequestedAlertTimestamp: number) {
    this._lastClaimedAmountMoreThanRequestedAlertTimestamp = lastClaimedAmountMoreThanRequestedAlertTimestamp
  }

  public getClaimedAmountMoreThanRequestedAlertsCount(): number {
    return this._claimedAmountMoreThanRequestedAlertsCount
  }

  public setClaimedAmountMoreThanRequestedAlertsCount(claimedAmountMoreThanRequestedAlertsCount: number) {
    this._claimedAmountMoreThanRequestedAlertsCount = claimedAmountMoreThanRequestedAlertsCount
  }
}
