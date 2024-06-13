import * as E from 'fp-ts/Either'

export interface IBnbAdiEthClient {
  isSenderApproved: (address: string, blockNumber: number) => Promise<E.Either<Error, boolean>>
}
