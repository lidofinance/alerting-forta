import { IL1BridgeBalanceClient } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { retryAsync } from 'ts-retry'
import { ERC20Bridged } from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { ethers } from 'ethers'
import { ETH_BLOCK_TIME_12Sec } from '../utils/constants'
import { BlockDto } from '../entity/blockDto'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class ETHProvider implements IL1BridgeBalanceClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly wStEthRunner: ERC20Bridged
  private readonly ldoRunner: ERC20Bridged
  private readonly metrics: Metrics

  private latestL1Block: BlockDto | null

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
    this.latestL1Block = null
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

  public async getBlock(latestTime: Date): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getBlock.name }).startTimer()
    try {
      if (
        this.latestL1Block !== null &&
        new Date(this.latestL1Block.timestamp * 1000).getTime() + ETH_BLOCK_TIME_12Sec * 1000 >= latestTime.getTime()
      ) {
        this.metrics.etherJsRequest.labels({ method: this.getBlock.name, status: StatusOK }).inc()
        end({ status: StatusOK })
        return E.right(this.latestL1Block)
      }

      const latestBlockNumber = await retryAsync<BlockDto>(
        async (): Promise<BlockDto> => {
          const ethBlock = await this.jsonRpcProvider.getBlock('latest')

          return {
            number: ethBlock.number,
            timestamp: ethBlock.timestamp,
            parentHash: ethBlock.parentHash,
            hash: ethBlock.hash,
          }
        },
        { delay: DELAY_IN_500MS, maxTry: 10 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getBlock.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      this.latestL1Block = latestBlockNumber
      return E.right(latestBlockNumber)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlock.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest block number`))
    }
  }
}
