import { BlockTag } from '@ethersproject/providers'
import * as E from 'fp-ts/Either'

export abstract class IAclChangesClient {
  public abstract getRoleMembers(
    address: string,
    hash: string,
    currentBlock: BlockTag,
  ): Promise<E.Either<Error, string[]>>
  public abstract getOwner(address: string, method: string, currentBlock: number): Promise<E.Either<Error, string>>
  public abstract isDeployed(address: string, blockNumber?: number): Promise<E.Either<Error, boolean>>
}
