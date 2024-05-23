import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'

export abstract class IEnsNamesClient {
  public abstract getEnsExpiryTimestamp(name: string): Promise<E.Either<Error, BigNumber>>
}
