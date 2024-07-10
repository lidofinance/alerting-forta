import { Log, BlockWithTransactions } from '@ethersproject/abstract-provider'
import { ethers } from 'ethers'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { BlockDto, BlockDtoWithTransactions, BlockHash, TransactionDto, WithdrawalRecord } from '../entity/blockDto'
import BigNumber from 'bignumber.js'
import { ArbERC20, ERC20Bridged, L2ERC20TokenGateway as L2BridgeRunner } from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { WithdrawalInitiatedEvent } from '../generated/typechain/L2ERC20TokenGateway'
import { IMonitorWithdrawalsClient } from '../services/monitor_withdrawals'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { IL2BridgeBalanceClient } from '../services/bridge_balance'
import { LRUCache } from 'lru-cache'
import { Block } from '@ethersproject/providers'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

const ldo = 'ldo'
const wstEth = 'WstEth'

export enum Direction {
  Left,
  Right,
}

export class ArbitrumClient implements IMonitorWithdrawalsClient, IL2BridgeBalanceClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly l2BridgeRunner: L2BridgeRunner
  private readonly metrics: Metrics

  private readonly bridgedWstEthRunner: ERC20Bridged
  private readonly bridgedLdoRunner: ArbERC20
  private readonly l2BlocksStore: LRUCache<BlockHash, BlockDtoWithTransactions>
  private readonly l2bridgeCache: LRUCache<BlockHash, BigNumber>

  constructor(
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    metrics: Metrics,
    l2BridgeRunner: L2BridgeRunner,
    bridgedWstEthRunner: ERC20Bridged,
    bridgedLdoRunner: ArbERC20,
    cache: LRUCache<BlockHash, BlockDtoWithTransactions>,
    l2bridgeCache: LRUCache<BlockHash, BigNumber>,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.metrics = metrics
    this.l2BridgeRunner = l2BridgeRunner
    this.bridgedWstEthRunner = bridgedWstEthRunner
    this.bridgedLdoRunner = bridgedLdoRunner
    this.l2BlocksStore = cache
    this.l2bridgeCache = l2bridgeCache
  }

  public async getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, WithdrawalInitiatedEvent[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWithdrawalEvents.name }).startTimer()

    const batchSize = 10_000
    const events: WithdrawalInitiatedEvent[] = []
    for (let i = fromBlockNumber; i <= toBlockNumber; i += batchSize) {
      const from = i
      const to = Math.min(i + batchSize - 1, toBlockNumber)

      try {
        const out = await retryAsync<WithdrawalInitiatedEvent[]>(
          async (): Promise<WithdrawalInitiatedEvent[]> => {
            return await this.l2BridgeRunner.queryFilter(this.l2BridgeRunner.filters.WithdrawalInitiated(), from, to)
          },
          { delay: 500, maxTry: 5 },
        )
        events.push(...out)
      } catch (e) {
        this.metrics.etherJsRequest.labels({ method: this.getWithdrawalEvents.name, status: StatusFail }).inc()
        end({ status: StatusFail })

        return E.left(
          new NetworkError(
            `Could not fetch withdrawEvents. cause: ${e}, startBlock: ${from}, toBlock: ${end}. Total ${from - to}`,
          ),
        )
      }
    }

    this.metrics.etherJsRequest.labels({ method: this.getWithdrawalEvents.name, status: StatusOK }).inc()
    end({ status: StatusOK })

    return E.right(events)
  }

  public async getWithdrawalRecords(
    withdrawalEvents: WithdrawalInitiatedEvent[],
  ): Promise<E.Either<NetworkError, WithdrawalRecord[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWithdrawalRecords.name }).startTimer()

    const out: WithdrawalRecord[] = []

    const promises = []
    const m = new Map<number, number>()
    for (let i = 0; i < withdrawalEvents.length; i++) {
      if (withdrawalEvents[i].args) {
        promises.push(withdrawalEvents[i].getBlock())
        m.set(promises.length - 1, i)
      }
    }

    try {
      const blocks = await Promise.all(promises)
      for (let i = 0; i < blocks.length; i++) {
        const record: WithdrawalRecord = {
          timestamp: blocks[i].timestamp,
          // @ts-ignore
          amount: new BigNumber(String(withdrawalEvents[m.get(i)].args.amount)),
        }

        out.push(record)
      }

      this.metrics.etherJsRequest.labels({ method: this.getWithdrawalEvents.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getWithdrawalRecords.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch block from withdrawEvent`))
    }
  }

  public async getLatestL2Block(): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLatestL2Block.name }).startTimer()
    try {
      const block = await this.jsonRpcProvider.getBlock('latest')

      this.metrics.etherJsRequest.labels({ method: this.getLatestL2Block.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
        hash: block.hash,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLatestL2Block.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest l2 block number`))
    }
  }

  public async getWstEthTotalSupply(l2blockHash: BlockHash): Promise<E.Either<Error, BigNumber>> {
    const cacheKey = `${wstEth}.${l2blockHash}`
    if (this.l2bridgeCache.has(cacheKey)) {
      // @ts-ignore
      return E.right(this.l2bridgeCache.get(cacheKey))
    }

    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWstEthTotalSupply.name }).startTimer()

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedWstEthRunner.functions.totalSupply({
            blockTag: l2blockHash,
          })

          return balance.toString()
        },
        { delay: 500, maxTry: 5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getWstEthTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      const result = new BigNumber(out)
      this.l2bridgeCache.set(cacheKey, result)

      return E.right(result)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getWstEthTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call bridgedWstEthRunner.functions.totalSupply`))
    }
  }

  public async getLdoTotalSupply(l2blockHash: BlockHash): Promise<E.Either<Error, BigNumber>> {
    const cacheKey = `${ldo}.${l2blockHash}`
    if (this.l2bridgeCache.has(cacheKey)) {
      // @ts-ignore
      return E.right(this.l2bridgeCache.get(cacheKey))
    }

    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLdoTotalSupply.name }).startTimer()

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedLdoRunner.functions.totalSupply({
            blockTag: l2blockHash,
          })

          return balance.toString()
        },
        { delay: 500, maxTry: 5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getLdoTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      const result = new BigNumber(out)
      this.l2bridgeCache.set(cacheKey, result)

      return E.right(result)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLdoTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call bridgedLdoRunner.functions.totalSupply`))
    }
  }

  public async getL2BlockByHash(l2BlockHash: string): Promise<E.Either<Error, BlockDtoWithTransactions>> {
    if (this.l2BlocksStore.has(l2BlockHash)) {
      // @ts-ignore
      return E.right(this.l2BlocksStore.get(l2BlockHash))
    }
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getL2BlockByHash.name })

    try {
      const blockWithTransactions = await retryAsync<BlockDtoWithTransactions>(
        async (): Promise<BlockDtoWithTransactions> => {
          let blockWithTransactions: BlockWithTransactions
          let logs: Log[] = []

          if (l2BlockHash !== 'latest') {
            ;[blockWithTransactions, logs] = await Promise.all([
              this.jsonRpcProvider.getBlockWithTransactions(l2BlockHash),
              this.jsonRpcProvider.getLogs({
                blockHash: l2BlockHash,
              }),
            ])
          } else {
            blockWithTransactions = await this.jsonRpcProvider.getBlockWithTransactions(l2BlockHash)
            logs = await this.jsonRpcProvider.getLogs({
              blockHash: blockWithTransactions.hash,
            })
          }

          const m = new Map<string, Log[]>()
          for (const log of logs) {
            if (!m.has(log.transactionHash)) {
              m.set(log.transactionHash, [log])
            } else {
              // @ts-ignore
              m.get(log.transactionHash).push(log)
            }
          }

          const transactions: TransactionDto[] = []
          for (const t of blockWithTransactions.transactions) {
            if (m.has(t.hash)) {
              const logs = m.get(t.hash)
              const trx: TransactionDto = {
                // @ts-ignore
                logs: logs,
                to: t.to ? t.to : null,
                block: {
                  timestamp: blockWithTransactions.timestamp,
                  number: blockWithTransactions.number,
                },
              }

              transactions.push(trx)
            }
          }

          return {
            number: blockWithTransactions.number,
            timestamp: blockWithTransactions.timestamp,
            parentHash: blockWithTransactions.parentHash,
            hash: blockWithTransactions.hash,
            transactions: transactions,
          }
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getL2BlockByHash.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      this.l2BlocksStore.set(blockWithTransactions.hash, blockWithTransactions)

      return E.right(blockWithTransactions)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getL2BlockByHash.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getBlockL2ByHash(${l2BlockHash}): ${e}`))
    }
  }

  public async getL2BlockDto(blockNumber: number): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getL2BlockDto.name }).startTimer()
    try {
      const block = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock(blockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
        hash: block.hash,
      }

      this.getL2BlockByHash(block.hash)

      this.metrics.etherJsRequest.labels({ method: this.getL2BlockDto.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(blockDto)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getL2BlockDto.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch l2block`))
    }
  }

  public async search(
    leftTimestamp: number,
    rightTimestamp: number,
    target: number,
    l2BlockDto: BlockDto,
  ): Promise<E.Either<Error, BlockDto>> {
    const leftBlockN = Math.floor((leftTimestamp * l2BlockDto.number) / l2BlockDto.timestamp)
    const rightBlockN = Math.floor((rightTimestamp * l2BlockDto.number) / l2BlockDto.timestamp)

    let direction: Direction = Direction.Right
    if (target === leftTimestamp) {
      direction = Direction.Left
    }

    const leftl2Block = await this.getL2BlockDto(leftBlockN)
    if (E.isLeft(leftl2Block)) {
      return E.left(leftl2Block.left)
    }

    const rightl2Block = await this.getL2BlockDto(rightBlockN)
    if (E.isLeft(rightl2Block)) {
      return E.left(rightl2Block.left)
    }

    let left = leftl2Block.right.number
    let right = rightl2Block.right.number

    let firstHit: BlockDto = l2BlockDto

    const extraOffset = 20
    while (leftTimestamp <= rightTimestamp) {
      if (direction == Direction.Right && left === right) {
        right += extraOffset
      } else if (direction == Direction.Left && left === right) {
        if (left === right) {
          left -= extraOffset
        }
      }

      const mid = (left + right) >> 1
      const l2Block = await this.getL2BlockDto(mid)
      if (E.isLeft(l2Block)) {
        return E.left(l2Block.left)
      }
      firstHit = l2Block.right

      if (l2Block.right.timestamp < target) {
        left = mid + 1
        leftTimestamp = l2Block.right.timestamp
      } else if (l2Block.right.timestamp > target) {
        right = mid - 1
        rightTimestamp = l2Block.right.timestamp
      } else {
        break
      }
    }

    let out = firstHit
    if (direction == Direction.Right) {
      while (out.timestamp === target) {
        const finalBlock = await this.getL2BlockDto(out.number + 1)
        if (E.isLeft(finalBlock)) {
          return E.right(out)
        }

        if (finalBlock.right.timestamp > target) {
          break
        }

        out = finalBlock.right
      }
    } else if (direction == Direction.Left) {
      while (out.timestamp === target) {
        const finalBlock = await this.getL2BlockDto(out.number - 1)
        if (E.isLeft(finalBlock)) {
          return E.right(out)
        }

        if (finalBlock.right.timestamp < target) {
          break
        }

        out = finalBlock.right
      }
    }

    return E.right(out)
  }
}
