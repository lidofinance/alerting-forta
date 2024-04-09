import * as E from 'fp-ts/Either'
import { IProxyContractData } from '../../clients/eth_provider'

export abstract class IProxyWatcherClient {
  public abstract isDeployed(address: string, blockNumber?: number): Promise<E.Either<Error, boolean>>
  public abstract getProxyImplementation(
    address: string,
    data: IProxyContractData,
    currentBlock: number,
  ): Promise<E.Either<Error, string[]>>
}
