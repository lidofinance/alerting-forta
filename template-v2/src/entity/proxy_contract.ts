import { ProxyShortABI } from '../generated'
import * as E from 'fp-ts/Either'

export abstract class IShortABIcaller {
  abstract getName(): string

  abstract getAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(
    blockNumber: number,
  ): Promise<E.Either<Error, string>>
}

export class ProxyContract implements IShortABIcaller {
  private readonly name: string
  private readonly address: string
  private readonly contract: ProxyShortABI

  constructor(name: string, address: string, contract: ProxyShortABI) {
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

  public async getProxyAdmin(
    blockNumber: number,
  ): Promise<E.Either<Error, string>> {
    try {
      const resp = await this.contract.proxy__getAdmin({
        blockTag: blockNumber,
      })

      return E.right(resp)
    } catch (e) {
      return E.left(new Error(`Could not fetch admin. cause ${e}`))
    }
  }

  public async getProxyImplementation(
    blockNumber: number,
  ): Promise<E.Either<Error, string>> {
    try {
      const resp = await this.contract.proxy__getImplementation({
        blockTag: blockNumber,
      })

      return E.right(resp)
    } catch (e) {
      return E.left(new Error(`Could not fetch implementation. cause ${e}`))
    }
  }
}
