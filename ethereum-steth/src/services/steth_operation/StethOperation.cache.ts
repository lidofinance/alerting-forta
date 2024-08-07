import BigNumber from 'bignumber.js'
import { BlockDto } from '../../entity/events'
import { ShareRate } from '../../entity/share_rate'

export class StethOperationCache {
  private _lastDepositorTxTime = 0
  private _lastBufferedEth = new BigNumber(0)
  private _criticalDepositableAmountTime = 0
  private _lastReportedDepositableEthTimestamp = 0
  private _lastReportedExecutorBalanceTimestamp = 0
  private _lastReportedStakingLimit10Timestamp = 0
  private _lastReportedStakingLimit30Timestamp = 0
  private _shareRate: ShareRate
  private _prev4Blocks: Array<BlockDto>

  constructor() {
    this._shareRate = {
      amount: new BigNumber(0),
      blockNumber: 0,
    }

    this._prev4Blocks = []
  }

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

  public getCriticalDepositableAmountTimestamp(): number {
    return this._criticalDepositableAmountTime
  }

  public setCriticalDepositableAmountTimestamp(blockTimestamp: number) {
    this._criticalDepositableAmountTime = blockTimestamp
  }

  public getLastReportedDepositableEthTimestamp(): number {
    return this._lastReportedDepositableEthTimestamp
  }

  public setLastReportedDepositableEthTimestamp(blockTimestamp: number) {
    this._lastReportedDepositableEthTimestamp = blockTimestamp
  }

  public getLastReportedExecutorBalanceTimestamp(): number {
    return this._lastReportedExecutorBalanceTimestamp
  }

  public setLastReportedExecutorBalanceTimestamp(blockTimestamp: number) {
    this._lastReportedExecutorBalanceTimestamp = blockTimestamp
  }

  public getLastReportedStakingLimit10Timestamp(): number {
    return this._lastReportedStakingLimit10Timestamp
  }

  public setLastReportedStakingLimit10Timestamp(blockTimestamp: number) {
    this._lastReportedStakingLimit10Timestamp = blockTimestamp
  }

  public getLastReportedStakingLimit30Timestamp(): number {
    return this._lastReportedStakingLimit30Timestamp
  }

  public setLastReportedStakingLimit30Timestamp(blockTimestamp: number) {
    this._lastReportedStakingLimit30Timestamp = blockTimestamp
  }

  public getShareRate(): ShareRate {
    return this._shareRate
  }

  public setShareRate(shareRate: ShareRate) {
    this._shareRate = shareRate
  }

  public setPrevBlock(curBlock: BlockDto) {
    for (let i = 0; i < this._prev4Blocks.length - 1; i++) {
      this._prev4Blocks[i] = this._prev4Blocks[i + 1]
    }

    this._prev4Blocks[this._prev4Blocks.length - 1] = curBlock
  }

  public setPrev4Blocks(prev4Blocks: Array<BlockDto>) {
    this._prev4Blocks = prev4Blocks
  }

  public getPrev4Blocks(): Array<BlockDto> {
    return this._prev4Blocks
  }

  public getParentBlock(): BlockDto {
    return this._prev4Blocks[this._prev4Blocks.length - 1]
  }
}
