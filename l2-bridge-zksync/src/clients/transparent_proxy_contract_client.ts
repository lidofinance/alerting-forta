import { ProxyAdmin } from '../generated'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/error'
import { ZKSYNC_BRIDGE_EXECUTOR_TYPE, ZKSYNC_WSTETH_BRIDGED_UPGRADEABLE_TYPE } from '../utils/constants'

export abstract class ITransparentProxyContractClient {
  abstract getName(): string

  abstract getProxyAdminAddress(): string

  abstract getProxyAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getOwner(blockNumber: number): Promise<E.Either<Error, string>>
}

export class TProxyContractClient implements ITransparentProxyContractClient {
  private readonly proxyAdminContract: ProxyAdmin
  private readonly proxyContract: ZKSYNC_WSTETH_BRIDGED_UPGRADEABLE_TYPE | ZKSYNC_BRIDGE_EXECUTOR_TYPE

  constructor(
    proxyAdminContract: ProxyAdmin,
    proxyContract: ZKSYNC_WSTETH_BRIDGED_UPGRADEABLE_TYPE | ZKSYNC_BRIDGE_EXECUTOR_TYPE,
  ) {
    if (proxyContract.proxyAdminAddress !== proxyAdminContract.address) {
      throw Error(
        `Could not create instance of ProxyContract: ${proxyContract.name} . Cause: ${proxyContract.proxyAdminAddress} != ${proxyAdminContract.address} proxyAdminAddress`,
      )
    }

    this.proxyAdminContract = proxyAdminContract
    this.proxyContract = proxyContract
  }

  public getName(): string {
    return this.proxyContract.name
  }

  public getProxyAdminAddress(): string {
    return this.proxyAdminContract.address
  }

  public getProxyAddress(): string {
    return this.proxyContract.proxyAddress
  }

  public async getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>> {
    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.proxyAdminContract.getProxyAdmin(this.proxyContract.proxyAddress, {
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
          return await this.proxyAdminContract.getProxyImplementation(this.proxyContract.proxyAddress, {
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
          return await this.proxyAdminContract.owner({
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
