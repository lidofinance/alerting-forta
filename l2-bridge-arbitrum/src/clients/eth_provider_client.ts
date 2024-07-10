import { IL1BridgeBalanceClient } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { retryAsync } from 'ts-retry'
import { ERC20Bridged } from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { ethers } from 'ethers'
import { BlockDto, BlockHash } from '../entity/blockDto'
import { LRUCache } from 'lru-cache'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

const ldo = 'ldo'
const wstEth = 'WstEth'

export class ETHProvider implements IL1BridgeBalanceClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly wStEthRunner: ERC20Bridged
  private readonly ldoRunner: ERC20Bridged
  private readonly metrics: Metrics
  private readonly arbL1TokenBridge: string
  private readonly arbL1LdoBridge: string

  private readonly l1BlockCache: LRUCache<BlockHash, BigNumber>

  constructor(
    metric: Metrics,
    wStEthRunner: ERC20Bridged,
    ldoRunner: ERC20Bridged,
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    l1BlockCache: LRUCache<BlockHash, BigNumber>,
    arbitrumL1TokenBridge: string,
    arbitrumL1LdoBridge: string,
  ) {
    this.metrics = metric
    this.wStEthRunner = wStEthRunner
    this.ldoRunner = ldoRunner
    this.jsonRpcProvider = jsonRpcProvider
    this.l1BlockCache = l1BlockCache
    this.arbL1TokenBridge = arbitrumL1TokenBridge
    this.arbL1LdoBridge = arbitrumL1LdoBridge
  }

  public async getWstEthBalance(l1blockHash: string): Promise<E.Either<Error, BigNumber>> {
    const cacheKey = `${wstEth}.${l1blockHash}`
    if (this.l1BlockCache.has(cacheKey)) {
      // @ts-ignore
      return E.right(this.l1BlockCache.get(cacheKey))
    }

    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWstEthBalance.name }).startTimer()
    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.wStEthRunner.functions.balanceOf(this.arbL1TokenBridge, {
            blockTag: l1blockHash,
          })

          this.metrics.etherJsRequest.labels({ method: this.getWstEthBalance.name, status: StatusOK }).inc()
          end({ status: StatusOK })

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      const result = new BigNumber(out)
      this.l1BlockCache.set(cacheKey, result)
      return E.right(result)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getWstEthBalance.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wStEthRunner.functions.balanceOf`))
    }
  }

  public async getLDOBalance(l1blockHash: string): Promise<E.Either<Error, BigNumber>> {
    const cacheKey = `${ldo}.${l1blockHash}`
    if (this.l1BlockCache.has(cacheKey)) {
      // @ts-ignore
      return E.right(this.l1BlockCache.get(cacheKey))
    }

    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLDOBalance.name }).startTimer()
    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.ldoRunner.functions.balanceOf(this.arbL1LdoBridge, {
            blockTag: l1blockHash,
          })

          this.metrics.etherJsRequest.labels({ method: this.getLDOBalance.name, status: StatusOK }).inc()
          end({ status: StatusOK })

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      const result = new BigNumber(out)
      this.l1BlockCache.set(cacheKey, result)
      return E.right(result)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLDOBalance.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call ldoRunner.functions.balanceOf`))
    }
  }

  public async getBlockByTag(tag: string): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getBlockByTag.name }).startTimer()
    try {
      const block = await this.jsonRpcProvider.getBlock(tag)

      this.metrics.etherJsRequest.labels({ method: this.getBlockByTag.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      const l1Block: BlockDto = {
        number: new BigNumber(block.number, 10).toNumber(),
        timestamp: new BigNumber(block.timestamp, 10).toNumber(),
        parentHash: block.parentHash,
        hash: block.hash,
      }

      return E.right(l1Block)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlockByTag.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch l1block by tag ${tag}`))
    }
  }
}
