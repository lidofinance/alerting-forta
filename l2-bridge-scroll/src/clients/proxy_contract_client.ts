import { OssifiableProxy } from '../generated'
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
  private readonly contract: OssifiableProxy

  constructor(name: string, address: string, contract: OssifiableProxy) {
    if (address !== contract.address) {
      throw Error(
        `Could not create instance of ProxyContract: ${name} . Cause: ${address} != ${contract.address} proxyAddress`,
      )
    }

    this.name = name
    this.address = address
    this.contract = contract
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
          return await this.contract.proxy__getAdmin({
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
          return await this.contract.proxy__getImplementation({
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
