import BigNumber from 'bignumber.js'
import { WithdrawalQueueBase } from '../generated/typechain/WithdrawalQueueERC721'

export type WithdrawalRequestSql = {
  id: number
  amount_steth: string
  amount_shares: string
  owner: string
  timestamp: number
  finalized: number
  claimed: number
}

export type WithdrawalStat = {
  finalizedSteth: number
  notFinalizedSteth: number
  claimedSteth: number
  notClaimedSteth: number
  steth: number
  total: number
  finalizedRequests: number
  notfinalizedRequests: number
  claimedRequests: number
  notClaimedRequests: number
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
      amount_steth: this.amountOfStETH.toString(),
      amount_shares: this.amountOfShares.toString(),
      owner: this.owner,
      timestamp: this.timestamp,
      finalized: Number(this.isFinalized),
      claimed: Number(this.isClaimed),
    }
  }

  public static sqlToWithdrawalRequest(o: WithdrawalRequestSql): WithdrawalRequest {
    return new WithdrawalRequest(
      o.id,
      new BigNumber(o.amount_steth.toString()),
      new BigNumber(o.amount_shares.toString()),
      o.owner,
      o.timestamp,
      Boolean(o.finalized),
      Boolean(o.claimed),
    )
  }
}
