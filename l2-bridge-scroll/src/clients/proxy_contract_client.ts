import { ProxyAdmin } from '../generated'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/error'

export abstract class IProxyContractClient {
  abstract getName(): string

  abstract getAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>>
}

export class ProxyContractClient implements IProxyContractClient {
  private readonly name: string
  private readonly address: string
  private readonly proxyAdminContract: ProxyAdmin

  constructor(name: string, address: string, proxyAdmin: ProxyAdmin) {
    this.name = name
    this.address = address
    this.proxyAdminContract = proxyAdmin
  }

  public getName(): string {
    return this.name
  }

  public getAddress(): string {
    return this.address
  }

  public async getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.proxyAdminContract.getProxyAdmin(this.address, {
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(resp)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch admin`))
    }
  }

  public async getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.proxyAdminContract.getProxyImplementation(this.address, {
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(resp)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch implementation`))
    }
  }
}
