import * as E from 'fp-ts/Either'
import { ethers } from 'forta-agent'

export abstract class ICrossChainClient {
  public abstract getBalance(address: string, tokenAddress?: string): Promise<E.Either<Error, ethers.BigNumber>>
  public abstract getBSCForwarderBridgeAdapterNames(): Promise<E.Either<Error, Map<string, string>>>
}
