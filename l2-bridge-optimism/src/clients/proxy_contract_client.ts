import { ProxyShortABI as ProxyAdmin } from '../generated/typechain'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/errors'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'

export abstract class IProxyContractClient {
  abstract getName(): string

  abstract getAddress(): string

  abstract getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>>

  abstract getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>>
}

export class ProxyContractClient implements IProxyContractClient {
  private readonly name: string
  private readonly proxyAdminContract: ProxyAdmin
  private readonly metrics: Metrics

  constructor(name: string, proxyAdmin: ProxyAdmin, metric: Metrics) {
    this.name = name
    this.proxyAdminContract = proxyAdmin
    this.metrics = metric
  }

  public getName(): string {
    return this.name
  }

  public getAddress(): string {
    return this.proxyAdminContract.address
  }

  public async getProxyAdmin(blockNumber: number): Promise<E.Either<Error, string>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getProxyAdmin.name }).startTimer()

    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.proxyAdminContract.proxy__getAdmin({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getProxyAdmin.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(resp)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getProxyAdmin.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch admin`))
    }
  }

  public async getProxyImplementation(blockNumber: number): Promise<E.Either<Error, string>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getProxyImplementation.name }).startTimer()

    try {
      const resp = await retryAsync<string>(
        async (): Promise<string> => {
          return await this.proxyAdminContract.proxy__getImplementation({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getProxyImplementation.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(resp)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getProxyImplementation.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch implementation`))
    }
  }
}
