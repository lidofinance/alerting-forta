import { ProxyAdmin } from '../generated'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/error'
import { TProxyContract } from '../utils/constants'

export abstract class ITransparentProxyContractClient {
  abstract getName(): string

  abstract getProxyAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getOwner(blockNumber: number): Promise<E.Either<Error, string>>
}

export class TProxyContractClient implements ITransparentProxyContractClient {
  private readonly proxyContract: TProxyContract
  private readonly contract: ProxyAdmin

  constructor(proxyContract: TProxyContract, contract: ProxyAdmin) {
    if (proxyContract.proxyAdminAddress !== contract.address) {
      throw Error(
        `Could not create instance of ProxyContract: ${proxyContract.name} . Cause: ${proxyContract.proxyAdminAddress} != ${contract.address} proxyAdminAddress`,
      )
    }

    this.proxyContract = proxyContract
    this.contract = contract
  }

  public getName(): string {
    return this.proxyContract.name
  }

  public getProxyAddress(): string {
    return this.proxyContract.proxyAddress
  }

  public async getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.contract.getProxyAdmin(this.proxyContract.proxyAddress, {
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
          return await this.contract.getProxyImplementation(this.proxyContract.proxyAddress, {
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

  public async getOwner(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.contract.owner({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(resp)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch owner`))
    }
  }
}
