import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../../utils/constants'

export type PoolBalanceState = {
  curveEthBalance: number
  curveStEthBalance: number
  curvePoolSize: number

  lastReportedCurveImbalance: number
  lastReportedCurveImbalanceTimestamp: number

  lastReportedCurveStEthToEthPrice: number
  lastReportedCurvePriceChangeLevel: number
  lastReportedCurveStEthToEthPriceTimestamp: number

  lastReportedChainlinkStEthToEthPrice: number
  lastReportedChainlinkPriceChangeLevel: number
  lastReportedChainlinkStEthToEthPriceTimestamp: number
}

export class PoolBalanceCache {
  private _curveEthBalance: BigNumber
  private _curveStEthBalance: BigNumber
  private _curvePoolSize: BigNumber

  private _lastReportedCurveImbalance: number
  private _lastReportedCurveImbalanceTimestamp: number

  private _lastReportedCurveStEthToEthPrice: number
  private _lastReportedCurvePriceChangeLevel: number
  private _lastReportedCurveStEthToEthPriceTimestamp: number

  private _lastReportedChainlinkStEthToEthPrice: number
  private _lastReportedChainlinkPriceChangeLevel: number
  private _lastReportedChainlinkStEthToEthPriceTimestamp: number

  constructor() {
    this._curveEthBalance = new BigNumber(0)
    this._curveStEthBalance = new BigNumber(0)
    this._curvePoolSize = new BigNumber(0)
    this._lastReportedCurveImbalance = 0
    this._lastReportedCurveImbalanceTimestamp = 0
    this._lastReportedCurveStEthToEthPrice = 0
    this._lastReportedChainlinkPriceChangeLevel = 0
    this._lastReportedChainlinkStEthToEthPriceTimestamp = 0
    this._lastReportedCurvePriceChangeLevel = 0
    this._lastReportedCurveStEthToEthPriceTimestamp = 0
    this._lastReportedChainlinkStEthToEthPrice = 0
  }

  get curveEthBalance(): BigNumber {
    return this._curveEthBalance
  }

  set curveEthBalance(value: BigNumber) {
    this._curveEthBalance = value
  }

  get curveStEthBalance(): BigNumber {
    return this._curveStEthBalance
  }

  set curveStEthBalance(value: BigNumber) {
    this._curveStEthBalance = value
  }

  get curvePoolSize(): BigNumber {
    return this._curvePoolSize
  }

  set curvePoolSize(value: BigNumber) {
    this._curvePoolSize = value
  }

  get lastReportedCurveImbalance(): number {
    return this._lastReportedCurveImbalance
  }

  set lastReportedCurveImbalance(value: number) {
    this._lastReportedCurveImbalance = value
  }

  get lastReportedCurveImbalanceTimestamp(): number {
    return this._lastReportedCurveImbalanceTimestamp
  }

  set lastReportedCurveImbalanceTimestamp(value: number) {
    this._lastReportedCurveImbalanceTimestamp = value
  }

  get lastReportedCurveStEthToEthPrice(): number {
    return this._lastReportedCurveStEthToEthPrice
  }

  set lastReportedCurveStEthToEthPrice(value: number) {
    this._lastReportedCurveStEthToEthPrice = value
  }

  get lastReportedChainlinkPriceChangeLevel(): number {
    return this._lastReportedChainlinkPriceChangeLevel
  }

  set lastReportedChainlinkPriceChangeLevel(value: number) {
    this._lastReportedChainlinkPriceChangeLevel = value
  }

  get lastReportedChainlinkStEthToEthPriceTimestamp(): number {
    return this._lastReportedChainlinkStEthToEthPriceTimestamp
  }

  set lastReportedChainlinkStEthToEthPriceTimestamp(value: number) {
    this._lastReportedChainlinkStEthToEthPriceTimestamp = value
  }

  get lastReportedCurvePriceChangeLevel(): number {
    return this._lastReportedCurvePriceChangeLevel
  }

  set lastReportedCurvePriceChangeLevel(value: number) {
    this._lastReportedCurvePriceChangeLevel = value
  }

  get lastReportedCurveStEthToEthPriceTimestamp(): number {
    return this._lastReportedCurveStEthToEthPriceTimestamp
  }

  set lastReportedCurveStEthToEthPriceTimestamp(value: number) {
    this._lastReportedCurveStEthToEthPriceTimestamp = value
  }

  get lastReportedChainlinkStEthToEthPrice(): number {
    return this._lastReportedChainlinkStEthToEthPrice
  }

  set lastReportedChainlinkStEthToEthPrice(value: number) {
    this._lastReportedChainlinkStEthToEthPrice = value
  }

  public getState(): Map<string, string> {
    const state: PoolBalanceState = {
      curveEthBalance: this.curveEthBalance.div(ETH_DECIMALS).toNumber(),
      curveStEthBalance: this.curveStEthBalance.div(ETH_DECIMALS).toNumber(),
      curvePoolSize: this.curvePoolSize.div(ETH_DECIMALS).toNumber(),

      lastReportedCurveImbalance: this.lastReportedCurveImbalance,
      lastReportedCurveImbalanceTimestamp: this.lastReportedCurveImbalanceTimestamp,

      lastReportedCurveStEthToEthPrice: this.lastReportedCurveStEthToEthPrice,
      lastReportedCurvePriceChangeLevel: this.lastReportedCurvePriceChangeLevel,
      lastReportedCurveStEthToEthPriceTimestamp: this.lastReportedCurveStEthToEthPriceTimestamp,

      lastReportedChainlinkStEthToEthPrice: this.lastReportedChainlinkStEthToEthPrice,
      lastReportedChainlinkPriceChangeLevel: this.lastReportedChainlinkPriceChangeLevel,
      lastReportedChainlinkStEthToEthPriceTimestamp: this.lastReportedChainlinkStEthToEthPriceTimestamp,
    }

    const out = new Map<string, string>()

    const dateTimeFormat = new Intl.DateTimeFormat('RU', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short',
      formatMatcher: 'basic',
      hour12: false,
      timeZone: 'UTC',
    })

    out.set('curve EthBalance:', state.curveEthBalance.toString())
    out.set('curve StEthBalance:', state.curveStEthBalance.toString())
    out.set('curve PoolSize:', state.curvePoolSize.toString())
    out.set(
      'curve Imbalance:',
      state.lastReportedCurveImbalance.toString() +
        ' ' +
        dateTimeFormat.format(new Date(this.lastReportedCurveImbalanceTimestamp * 1000)),
    )
    out.set('curve StEth:Eth', state.lastReportedCurveStEthToEthPrice.toString())
    out.set(
      'curve StEth:Eth price change:',
      state.lastReportedCurvePriceChangeLevel.toString() +
        '. ' +
        dateTimeFormat.format(new Date(this.lastReportedCurveStEthToEthPriceTimestamp * 1000)),
    )

    out.set('chainlink StEth:Eth', state.lastReportedChainlinkStEthToEthPrice.toString())
    out.set(
      'chainlink StEth:Eth price change:',
      state.lastReportedChainlinkPriceChangeLevel.toString() +
        '. ' +
        dateTimeFormat.format(new Date(this.lastReportedChainlinkStEthToEthPriceTimestamp * 1000)),
    )

    return out
  }
}
