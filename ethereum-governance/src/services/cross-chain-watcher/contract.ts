import * as E from 'fp-ts/Either'

export abstract class ICrossChainClient {
  public abstract getBSCForwarderBridgeAdapterNames(): Promise<E.Either<Error, Map<string, string>>>
}
