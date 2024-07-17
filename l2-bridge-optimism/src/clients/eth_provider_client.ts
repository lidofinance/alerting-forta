import { IL1BridgeBalanceClient } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { retryAsync } from 'ts-retry'
import { ERC20Bridged } from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { ethers } from 'ethers'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class ETHProvider implements IL1BridgeBalanceClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly wStEthRunner: ERC20Bridged
  private readonly ldoRunner: ERC20Bridged
  private readonly metrics: Metrics

  constructor(
    metric: Metrics,
    wStEthRunner: ERC20Bridged,
    ldoRunner: ERC20Bridged,
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
  ) {
    this.metrics = metric
    this.wStEthRunner = wStEthRunner
    this.ldoRunner = ldoRunner
    this.jsonRpcProvider = jsonRpcProvider
  }

  public async getWstEthBalance(
    l1blockNumber: number,
    optimismL1TokenBridge: string,
  ): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWstEthBalance.name }).startTimer()
    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.wStEthRunner.functions.balanceOf(optimismL1TokenBridge, {
            blockTag: l1blockNumber,
          })

          this.metrics.etherJsRequest.labels({ method: this.getWstEthBalance.name, status: StatusOK }).inc()
          end({ status: StatusOK })

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getWstEthBalance.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wStEthRunner.functions.balanceOf`))
    }
  }

  public async getLDOBalance(l1blockNumber: number, optimismL1LdoBridge: string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLDOBalance.name }).startTimer()
    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.ldoRunner.functions.balanceOf(optimismL1LdoBridge, {
            blockTag: l1blockNumber,
          })

          this.metrics.etherJsRequest.labels({ method: this.getLDOBalance.name, status: StatusOK }).inc()
          end({ status: StatusOK })

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLDOBalance.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call ldoRunner.functions.balanceOf`))
    }
  }

  public async getBlockNumber(): Promise<E.Either<Error, number>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getBlockNumber.name }).startTimer()
    try {
      const latestBlockNumber = await retryAsync<number>(
        async (): Promise<number> => {
          return await this.jsonRpcProvider.getBlockNumber()
        },
        { delay: DELAY_IN_500MS, maxTry: 10 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getBlockNumber.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(latestBlockNumber)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlockNumber.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest block number`))
    }
  }
}
