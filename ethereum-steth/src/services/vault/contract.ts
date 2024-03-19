import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { ETHDistributedEvent } from '../../generated/smart-contracts/Lido'

export abstract class IVaultClient {
  public abstract getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getBalanceByBlockHash(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>>

  public abstract getETHDistributedEvent(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, ETHDistributedEvent | null>>
}
