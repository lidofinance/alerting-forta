import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { ProxyAdmin } from '../generated'

export abstract class IShortABIcaller {
  abstract getName(): string

  abstract getAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>>
}

export class ProxyContract implements IShortABIcaller {
  private readonly name: string
  private readonly address: string
  private readonly contract: ProxyAdmin

  constructor(name: string, address: string, contract: ProxyAdmin) {
    if (address !== contract.address) {
      throw Error(
        `Could not create instance of ProxyAdmin: ${name} . Cause: ${address} != ${contract.address} proxyAddress`,
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
          // TODO: where to get address
          return await this.contract.getProxyAdmin({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(resp)
    } catch (e) {
      return E.left(new Error(`Could not fetch admin. cause ${e}`))
    }
  }

  public async getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          // TODO: where to get address
          return await this.contract.getProxyImplementation({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(resp)
    } catch (e) {
      return E.left(new Error(`Could not fetch implementation. cause ${e}`))
    }
  }
}
