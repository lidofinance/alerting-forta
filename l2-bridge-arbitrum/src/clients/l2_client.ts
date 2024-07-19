import { Log, Block } from '@ethersproject/abstract-provider'
import { ethers } from 'ethers'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import BigNumber from 'bignumber.js'
import { ArbERC20, ERC20Bridged } from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { IL2BridgeBalanceClient } from '../services/bridge_balance'
import { Logger } from 'winston'
import { BlockDto } from '../entity/l2block'
import { RpcRequest } from '../entity/events'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class L2Client implements IL2BridgeBalanceClient {
  private readonly l2Provider: ethers.providers.JsonRpcProvider
  private readonly metrics: Metrics

  private readonly bridgedWstEthRunner: ERC20Bridged
  private readonly bridgedLdoRunner: ArbERC20
  private readonly logger: Logger

  constructor(
    l2Provider: ethers.providers.JsonRpcProvider,
    metrics: Metrics,
    bridgedWstEthRunner: ERC20Bridged,
    bridgedLdoRunner: ArbERC20,
    logger: Logger,
  ) {
    this.l2Provider = l2Provider
    this.metrics = metrics
    this.bridgedWstEthRunner = bridgedWstEthRunner
    this.bridgedLdoRunner = bridgedLdoRunner
    this.logger = logger
  }

  public async getLatestL2Block(): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLatestL2Block.name }).startTimer()
    try {
      const block = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.l2Provider.getBlock('latest')
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getLatestL2Block.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(
        new BlockDto(
          block.hash,
          block.parentHash,
          new BigNumber(block.number, 10).toNumber(),
          new BigNumber(block.timestamp, 10).toNumber(),
        ),
      )
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLatestL2Block.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest l2 block number`))
    }
  }

  public async getWstEthTotalSupply(blockTag: string | number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWstEthTotalSupply.name }).startTimer()

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedWstEthRunner.functions.totalSupply({
            blockTag: blockTag,
          })

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getWstEthTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getWstEthTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call bridgedWstEthRunner.functions.totalSupply`))
    }
  }

  public async getLdoTotalSupply(blockTag: string | number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLdoTotalSupply.name }).startTimer()

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedLdoRunner.functions.totalSupply({
            blockTag: blockTag,
          })

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getLdoTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLdoTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call bridgedLdoRunner.functions.totalSupply`))
    }
  }

  public async fetchL2BlocksByList(l2BlockNumbers: number[]): Promise<BlockDto[]> {
    const batchRequests: RpcRequest[] = []
    for (let i = 0; i <= l2BlockNumbers.length - 1; i++) {
      batchRequests.push({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [`0x${l2BlockNumbers[i].toString(16)}`, false],
        id: i, // Use a unique identifier for each request
      })
    }

    return this.fetchBlocks(batchRequests)
  }

  public async fetchL2Blocks(startBlock: number, endBlock: number): Promise<BlockDto[]> {
    const batchRequests: RpcRequest[] = []
    for (let i = startBlock; i <= endBlock; i++) {
      batchRequests.push({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [`0x${i.toString(16)}`, false],
        id: i,
      })
    }

    return this.fetchBlocks(batchRequests)
  }

  private async fetchBlocks(batchRequests: RpcRequest[]): Promise<BlockDto[]> {
    const formatter = new ethers.providers.Formatter()
    const doRequest = (request: unknown[]): Promise<BlockDto[]> => {
      return retryAsync<BlockDto[]>(
        async (): Promise<BlockDto[]> => {
          const response: Response = await fetch(this.l2Provider.connection.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          })

          if (!response.ok) {
            throw new NetworkError(`Status: ${response.status}, request: ${JSON.stringify(request)}`, 'FetchBlocksErr')
          }

          const result: BlockDto[] = []
          const objects = (await response.json()) as unknown[]

          for (const obj of objects) {
            if (Object.prototype.hasOwnProperty.call(obj, 'result')) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              const block = formatter.block(obj.result)
              const l2Block = new BlockDto(
                block.hash,
                block.parentHash,
                new BigNumber(block.number).toNumber(),
                new BigNumber(block.timestamp).toNumber(),
              )

              result.push(l2Block)
            } else {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              throw new Error(obj.error.message)
            }
          }

          return result
        },
        { delay: 750, maxTry: 10 },
      )
    }

    const chunkSize = 25
    const out: BlockDto[] = []

    let allowedExtraRequest: number = 30
    for (let i = 0; i < batchRequests.length; i += chunkSize) {
      const request = batchRequests.slice(i, i + chunkSize)
      try {
        // chunkSize per milliseconds
        if (i > 0) {
          await new Promise((f) => setTimeout(f, 50))
        }
        const blocks = await doRequest(request)
        out.push(...blocks)
      } catch (e) {
        this.logger.warn(`${e}`)
        if (allowedExtraRequest === 0) {
          break
        }

        batchRequests.push(...request)
        allowedExtraRequest -= 1
      }
    }

    return out
  }

  public async fetchL2Logs(startBlock: number, endBlock: number, address: string[]): Promise<E.Either<Error, Log[]>> {
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
          const response: Response = await fetch(this.l2Provider.connection.url, {
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

  public async getL2BlockByTag(tag: string): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getL2BlockByTag.name }).startTimer()
    try {
      const block = await this.l2Provider.getBlock(tag)

      this.metrics.etherJsRequest.labels({ method: this.getL2BlockByTag.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      const l2Block = new BlockDto(
        block.hash,
        block.parentHash,
        new BigNumber(block.number, 10).toNumber(),
        new BigNumber(block.timestamp, 10).toNumber(),
      )

      return E.right(l2Block)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getL2BlockByTag.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch l2block by tag ${tag}`))
    }
  }
}
