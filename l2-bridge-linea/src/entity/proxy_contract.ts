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
  private readonly ITransparentUpgradeableProxy: string
  private readonly contract: ProxyAdmin

  constructor(name: string, ITransparentUpgradeableProxy: string, proxyAdminAddress: string, contract: ProxyAdmin) {
    if (proxyAdminAddress !== contract.address) {
      throw Error(
        `Could not create instance of ProxyAdmin: ${name}. Cause: ${proxyAdminAddress} != ${contract.address} proxyAddress`,
      )
    }

    this.name = name
    this.ITransparentUpgradeableProxy = ITransparentUpgradeableProxy
    this.contract = contract
  }

  public getName(): string {
    return this.name
  }

  public getAddress(): string {
    return this.ITransparentUpgradeableProxy
  }

  public async getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.contract.getProxyAdmin(this.ITransparentUpgradeableProxy, {
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
          return await this.contract.getProxyImplementation(this.ITransparentUpgradeableProxy, {
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
