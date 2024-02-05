import type { BigNumber } from 'bignumber.js'
import type { TypedEvent } from '../../generated/common'
import { Log, LogDescription } from 'forta-agent'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { StakingLimitInfo } from '../../entity/staking_limit_info'
import * as E from 'fp-ts/Either'

export abstract class IStethClient {
  public abstract getHistory(
    depositSecurityAddress: string,
    startBlock: number,
    endBlock: number,
  ): Promise<E.Either<Error, TransactionResponse[]>>

  public abstract getStethBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getShareRate(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getBufferedEther(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getUnbufferedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>>

  public abstract getWithdrawalsFinalizedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>>

  public abstract getDepositableEther(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>>
}

export type TransactionEventContract = {
  addresses: {
    [key: string]: boolean
  }
  logs: Log[]
  filterLog: (eventAbi: string | string[], contractAddress?: string | string[]) => LogDescription[]
  to: string | null
  timestamp: number
}
