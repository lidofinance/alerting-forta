import * as E from 'fp-ts/Either'

export abstract class IAclChangesClient {
  public abstract getContractOwner(
    address: string,
    method: string,
    currentBlock: number,
  ): Promise<E.Either<Error, string>>
  public abstract isDeployed(address: string, blockNumber?: number): Promise<E.Either<Error, boolean>>
}
