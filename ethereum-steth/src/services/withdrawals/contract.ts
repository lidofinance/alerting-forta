import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { WithdrawalRequest } from '../../entity/withdrawal_request'
import { StakingLimitInfo } from '../../entity/staking_limit_info'

export abstract class IWithdrawalsClient {
  public abstract getTransaction(txHash: string): Promise<E.Either<Error, TransactionResponse>>

  public abstract getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>>

  public abstract getUnfinalizedStETH(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getWithdrawalStatuses(
    requestsRange: number[],
    currentBlock: number,
  ): Promise<E.Either<Error, WithdrawalRequest[]>>

  public abstract getTotalPooledEther(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getTotalShares(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract isBunkerModeActive(blockNumber: number): Promise<E.Either<Error, boolean>>

  public abstract getBunkerTimestamp(blockNumber: number): Promise<E.Either<Error, number>>

  public abstract getWithdrawalLastRequestId(blockNumber: number): Promise<E.Either<Error, number>>

  public abstract getWithdrawalStatus(
    requestId: number,
    blockNumber: number,
  ): Promise<E.Either<Error, WithdrawalRequest>>

  public abstract getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>>
}
