import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { ProxyShortABI } from '../generated'
import { OProxyContract } from '../utils/constants'

export abstract class IProxyContractClient {
  abstract getName(): string

  abstract getAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>>
}

export class ProxyContractClient implements IProxyContractClient {
  private readonly proxyContract: OProxyContract
  private readonly contract: ProxyShortABI

  constructor(proxyContract: OProxyContract, contract: ProxyShortABI) {
    if (proxyContract.address !== contract.address) {
      throw Error(
        `Could not create instance of ProxyAdmin: ${proxyContract.name}. Cause: ${proxyContract.address} != ${contract.address} address`,
      )
    }

    this.proxyContract = proxyContract
    this.contract = contract
  }

  public getName(): string {
    return this.proxyContract.name
  }

  public getAddress(): string {
    return this.contract.address
  }

  public async getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.contract.proxy__getAdmin({
            blockTag: blockNumber,
          })
        },
        { delay: 1000, maxTry: 5 },
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
          return await this.contract.proxy__getImplementation({
            blockTag: blockNumber,
          })
        },
        { delay: 1000, maxTry: 5 },
      )

      return E.right(resp)
    } catch (e) {
      return E.left(new Error(`Could not fetch implementation. cause ${e}`))
    }
  }
}
