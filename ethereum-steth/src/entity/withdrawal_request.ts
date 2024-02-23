import BigNumber from 'bignumber.js'
import { WithdrawalQueueBase } from '../generated/WithdrawalQueueERC721'

export type WithdrawalRequestSql = {
  id: number
  amountOfStETH: string
  amountOfShares: string
  owner: string
  timestamp: number
  isFinalized: number
  isClaimed: number
}

export class WithdrawalRequest {
  public id: number
  public amountOfStETH: BigNumber
  public amountOfShares: BigNumber
  public owner: string
  public timestamp: number
  public isFinalized: boolean
  public isClaimed: boolean

  constructor(
    id: number,
    amountOfStETH: BigNumber,
    amountOfShares: BigNumber,
    owner: string,
    timestamp: number,
    isFinalized: boolean,
    isClaimed: boolean,
  ) {
    this.id = id
    this.amountOfStETH = amountOfStETH
    this.amountOfShares = amountOfShares
    this.owner = owner
    this.timestamp = timestamp
    this.isFinalized = isFinalized
    this.isClaimed = isClaimed
  }

  public static toWithdrawalRequest(
    withdrawalRequest: WithdrawalQueueBase.WithdrawalRequestStatusStructOutput,
    requestId: number,
  ): WithdrawalRequest {
    return new WithdrawalRequest(
      requestId,
      new BigNumber(withdrawalRequest.amountOfStETH.toString()),
      new BigNumber(withdrawalRequest.amountOfShares.toString()),
      withdrawalRequest.owner,
      withdrawalRequest.timestamp.toNumber(),
      withdrawalRequest.isFinalized,
      withdrawalRequest.isClaimed,
    )
  }

  public toSqlObject(): WithdrawalRequestSql {
    return {
      id: this.id,
      amountOfStETH: this.amountOfStETH.toString(),
      amountOfShares: this.amountOfShares.toString(),
      owner: this.owner,
      timestamp: this.timestamp,
      isFinalized: Number(this.isFinalized),
      isClaimed: Number(this.isClaimed),
    }
  }

  public static sqlToWithdrawalRequest(o: WithdrawalRequestSql): WithdrawalRequest {
    return new WithdrawalRequest(
      o.id,
      new BigNumber(o.amountOfStETH.toString()),
      new BigNumber(o.amountOfShares.toString()),
      o.owner,
      o.timestamp,
      Boolean(o.isFinalized),
      Boolean(o.isClaimed),
    )
  }
}
