import * as E from 'fp-ts/Either'
import { ProxyInfo } from '../../shared/types'

export abstract class IProxyWatcherClient {
  public abstract isDeployed(address: string, blockNumber?: number): Promise<E.Either<Error, boolean>>
  public abstract getProxyImplementation(
    address: string,
    data: ProxyInfo,
    currentBlock: number,
  ): Promise<E.Either<Error, string>>
}
