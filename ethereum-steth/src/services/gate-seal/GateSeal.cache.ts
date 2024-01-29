export class GateSealCache {
  private _lastNoPauseRoleAlertTimestamp = 0
  private _lastExpiryGateSealAlertTimestamp = 0

  constructor() {}

  public getLastNoPauseRoleAlertTimestamp(): number {
    return this._lastNoPauseRoleAlertTimestamp
  }

  public setLastNoPauseRoleAlertTimestamp(lastNoPauseRoleAlertTimestamp: number) {
    this._lastNoPauseRoleAlertTimestamp = lastNoPauseRoleAlertTimestamp
  }

  public getLastExpiryGateSealAlertTimestamp(): number {
    return this._lastExpiryGateSealAlertTimestamp
  }

  public setLastExpiryGateSealAlertTimestamp(lastExpiryGateSealAlertTimestamp: number) {
    this._lastExpiryGateSealAlertTimestamp = lastExpiryGateSealAlertTimestamp
  }
}
