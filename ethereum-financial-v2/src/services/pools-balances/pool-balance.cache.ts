import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../../utils/constants'

export type PoolBalanceState = {
  curveETH: string
  curveStEth: string
  curveStEthPeg: string
  chainlinkStEthPeg: string
  curvePoolImbalance: string
  curvePoolSize: string
}

export class PoolBalanceCache {
  private _curveEthBalance: BigNumber
  private _curveStEthBalance: BigNumber
  private _curvePoolSize: BigNumber

  private _lastReportedImbalance: number
  private _lastReportedImbalanceTimestamp: number

  private _lastReportedCurvePegValue: number
  private _lastReportedCurvePegLevel: number
  private _lastReportedCurvePegTimestamp: number

  private _lastReportedChainlinkPegLevel: number
  private _lastReportedChainlinkPegTimestamp: number

  private _curveUnstakedStEth: BigNumber
  private _curveLastReportedUnstakedStEthTimestamp: number

  constructor() {
    this._curveEthBalance = new BigNumber(0)
    this._curveStEthBalance = new BigNumber(0)
    this._curvePoolSize = new BigNumber(0)
    this._lastReportedImbalance = 0
    this._lastReportedImbalanceTimestamp = 0
    this._lastReportedCurvePegValue = 0
    this._lastReportedChainlinkPegLevel = 0
    this._lastReportedChainlinkPegTimestamp = 0
    this._lastReportedCurvePegLevel = 0
    this._lastReportedCurvePegTimestamp = 0
    this._curveUnstakedStEth = new BigNumber(0)
    this._curveLastReportedUnstakedStEthTimestamp = 0
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

  get lastReportedImbalance(): number {
    return this._lastReportedImbalance
  }

  set lastReportedImbalance(value: number) {
    this._lastReportedImbalance = value
  }

  get lastReportedImbalanceTimestamp(): number {
    return this._lastReportedImbalanceTimestamp
  }

  set lastReportedImbalanceTimestamp(value: number) {
    this._lastReportedImbalanceTimestamp = value
  }

  get lastReportedCurvePegValue(): number {
    return this._lastReportedCurvePegValue
  }

  set lastReportedCurvePegValue(value: number) {
    this._lastReportedCurvePegValue = value
  }

  get lastReportedChainlinkPegLevel(): number {
    return this._lastReportedChainlinkPegLevel
  }

  set lastReportedChainlinkPegLevel(value: number) {
    this._lastReportedChainlinkPegLevel = value
  }

  get lastReportedChainlinkPegTimestamp(): number {
    return this._lastReportedChainlinkPegTimestamp
  }

  set lastReportedChainlinkPegTimestamp(value: number) {
    this._lastReportedChainlinkPegTimestamp = value
  }

  get lastReportedCurvePegLevel(): number {
    return this._lastReportedCurvePegLevel
  }

  set lastReportedCurvePegLevel(value: number) {
    this._lastReportedCurvePegLevel = value
  }

  get lastReportedCurvePegTimestamp(): number {
    return this._lastReportedCurvePegTimestamp
  }

  set lastReportedCurvePegTimestamp(value: number) {
    this._lastReportedCurvePegTimestamp = value
  }

  get curveUnstakedStEth(): BigNumber {
    return this._curveUnstakedStEth
  }

  set curveUnstakedStEth(value: BigNumber) {
    this._curveUnstakedStEth = value
  }

  get curveLastReportedUnstakedStEthTimestamp(): number {
    return this._curveLastReportedUnstakedStEthTimestamp
  }

  set curveLastReportedUnstakedStEthTimestamp(value: number) {
    this._curveLastReportedUnstakedStEthTimestamp = value
  }

  public getState(): PoolBalanceState {
    return {
      curveETH: this.curveEthBalance.div(ETH_DECIMALS).toFixed(4),
      curveStEth: this.curveStEthBalance.div(ETH_DECIMALS).toFixed(4),
      curveStEthPeg: this.lastReportedCurvePegValue.toFixed(4),
      chainlinkStEthPeg: this.lastReportedChainlinkPegLevel.toFixed(4),
      curvePoolImbalance: this.lastReportedImbalance.toString(),
      curvePoolSize: this.curvePoolSize.div(ETH_DECIMALS).toFixed(4),
    }
  }
}
