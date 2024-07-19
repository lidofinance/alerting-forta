import { IL1BridgeBalanceClient } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import { retryAsync } from 'ts-retry'
import { ERC20Bridged } from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { ethers } from 'ethers'
import { LRUCache } from 'lru-cache'
import { BlockDto } from '../entity/l2block'
import { Log } from '@ethersproject/abstract-provider'
import { RpcRequest } from '../entity/events'
import { Logger } from 'winston'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

const ldo = 'ldo'
const wstEth = 'WstEth'

export class ETHProvider implements IL1BridgeBalanceClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly wStEthRunner: ERC20Bridged
  private readonly ldoRunner: ERC20Bridged
  private readonly metrics: Metrics
  private readonly L1TokenBridge: string
  private readonly L1LdoBridge: string

  private readonly l1BlockCache: LRUCache<string, BigNumber>
  private readonly logger: Logger

  constructor(
    metric: Metrics,
    wStEthRunner: ERC20Bridged,
    ldoRunner: ERC20Bridged,
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    l1BlockCache: LRUCache<string, BigNumber>,
    L1TokenBridge: string,
    L1LdoBridge: string,
    logger: Logger,
  ) {
    this.metrics = metric
    this.wStEthRunner = wStEthRunner
    this.ldoRunner = ldoRunner
    this.jsonRpcProvider = jsonRpcProvider
    this.l1BlockCache = l1BlockCache
    this.L1TokenBridge = L1TokenBridge
    this.L1LdoBridge = L1LdoBridge
    this.logger = logger
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
          const [balance] = await this.wStEthRunner.functions.balanceOf(this.L1TokenBridge, {
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
          const [balance] = await this.ldoRunner.functions.balanceOf(this.L1LdoBridge, {
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

      const l1Block = new BlockDto(
        block.hash,
        block.parentHash,
        new BigNumber(block.number, 10).toNumber(),
        new BigNumber(block.timestamp, 10).toNumber(),
      )

      return E.right(l1Block)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlockByTag.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch l1block by tag ${tag}`))
    }
  }

  public async fetchL1Logs(startBlock: number, endBlock: number, address: string[]): Promise<E.Either<Error, Log[]>> {
    const batchSize = 2_000
    const batchRequests: RpcRequest[] = []
    for (let i = startBlock; i <= endBlock; i += batchSize) {
      const from = i
      const to = Math.min(i + batchSize - 1, endBlock)

      batchRequests.push({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [
          {
            address: address,
            fromBlock: `0x${new BigNumber(from).toString(16)}`,
            toBlock: `0x${new BigNumber(to).toString(16)}`,
          },
        ],
        id: i, // Use a unique identifier for each request
      })
    }

    const doRequest = (request: RpcRequest[]): Promise<Log[]> => {
      return retryAsync<Log[]>(
        async (): Promise<Log[]> => {
          const response: Response = await fetch(this.jsonRpcProvider.connection.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          })

          if (!response.ok) {
            throw new NetworkError(`Status: ${response.status}, request: ${JSON.stringify(request)}`, 'FetchBlocksErr')
          }

          const result: Log[] = []
          const objects = (await response.json()) as unknown[]

          for (const obj of objects) {
            if (Object.prototype.hasOwnProperty.call(obj, 'result')) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              const logs = obj.result as Log[]
              result.push(...logs)
            } else {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              throw new Error(obj.error.message)
            }
          }

          return result
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
    }

    const out: Log[] = []

    const chunkSize = 4
    let allowedExtraRequest: number = 30
    for (let i = 0; i < batchRequests.length; i += chunkSize) {
      const request = batchRequests.slice(i, i + chunkSize)
      try {
        // chunkSize x batchSize
        if (i > 0) {
          await new Promise((f) => setTimeout(f, 50))
        }
        const blocks = await doRequest(request)
        out.push(...blocks)
      } catch (e) {
        batchRequests.push(...request)
        allowedExtraRequest -= 1
        this.logger.warn(`${allowedExtraRequest} - ${e}`)

        if (allowedExtraRequest === 0) {
          break
        }
      }
    }

    return E.right(out)
  }
}
