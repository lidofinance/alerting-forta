import { OssifiableProxy } from '../generated'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/error'
import { ZKSYNC_L2ERC20_TOKEN_BRIDGED_TYPE } from '../utils/constants'

export abstract class IOssifiableProxyContractClient {
  abstract getName(): string

  abstract getProxyAdminAddress(): string

  abstract getProxyAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getOssified(blockNumber: number): Promise<E.Either<Error, boolean>>
}

export class OProxyContractClient implements IOssifiableProxyContractClient {
  private readonly contract: OssifiableProxy
  private readonly proxyContract: ZKSYNC_L2ERC20_TOKEN_BRIDGED_TYPE

  constructor(contract: OssifiableProxy, proxyContract: ZKSYNC_L2ERC20_TOKEN_BRIDGED_TYPE) {
    if (proxyContract.address !== contract.address) {
      throw Error(
        `Could not create instance of ProxyContract: ${proxyContract.name} . Cause: ${proxyContract.address} != ${contract.address} address`,
      )
    }

    this.proxyContract = proxyContract
    this.contract = contract
  }

  public getName(): string {
    return this.proxyContract.name
  }

  public getProxyAdminAddress(): string {
    return this.contract.address
  }

  public getProxyAddress(): string {
    return this.proxyContract.address
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

  public async getOssified(blockNumber: number): Promise<E.Either<Error, boolean>> {
    try {
      const resp = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          return await this.contract.proxy__getIsOssified({
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
