import { Block, Log } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import { Finding } from '../generated/proto/alert_pb'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/error'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import { BlockDto } from '../entity/blockDto'
import BigNumber from 'bignumber.js'
import { ERC20Short as BridgedWstEthRunner } from '../generated'
import { networkAlert } from '../utils/error'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5


export class L2Client {
  private readonly logger: Logger
  private readonly metrics: Metrics
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly bridgedWstEthRunner: BridgedWstEthRunner
  private readonly maxBlocksPerGetLogsRequest: number

  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    metrics: Metrics,
    logger: Logger,
    bridgedWstEthRunner: BridgedWstEthRunner,
    maxBlocksPerGetLogsRequest: number,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.logger = logger
    this.metrics = metrics
    this.bridgedWstEthRunner = bridgedWstEthRunner
    this.maxBlocksPerGetLogsRequest = maxBlocksPerGetLogsRequest
  }

  public async fetchL2Blocks(blockNumbers: Set<number>): Promise<BlockDto[]> {
    return this._fetchL2Blocks(blockNumbers)
  }

  public async fetchL2BlocksRange(startBlock: number, endBlock: number): Promise<BlockDto[]> {
    const blockNumbers = new Set<number>()
    for (let i = startBlock; i <= endBlock; i++) {
      blockNumbers.add(i)
    }
    return this._fetchL2Blocks(blockNumbers)
  }

  private async _fetchL2Blocks(blockNumbers: Set<number>): Promise<BlockDto[]> {
    const batchRequests = []
    for (const n of blockNumbers) {
      batchRequests.push({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [`0x${n.toString(16)}`, false],
        id: n, // Use a unique identifier for each request
      })
    }
    const formatter = new ethers.providers.Formatter()
    const doRequest = (request: unknown[]): Promise<BlockDto[]> => {
      return retryAsync<BlockDto[]>(
        async (): Promise<BlockDto[]> => {
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

          const result: BlockDto[] = []
          const objects = (await response.json()) as unknown[]

          for (const obj of objects) {
            if (Object.prototype.hasOwnProperty.call(obj, 'result')) {
              // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // // @ts-expect-error
              const block = formatter.block((obj as any).result)
              // result.push(formatter.block(obj.result))
              result.push(new BlockDto(block.hash, block.parentHash, block.number, block.timestamp))
            } else {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              throw new Error(obj.error.message)
            }
          }

          return result
        },
        { delay: 500, maxTry: 5 },
      )
    }

    const chunkSize = 25
    const out: BlockDto[] = []

    let allowedExtraRequest: number = 30
    for (let i = 0; i < batchRequests.length; i += chunkSize) {
      const request = batchRequests.slice(i, i + chunkSize)
      try {
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

    return out.toSorted((a, b) => a.number - b.number)
  }

  public async getL2Logs(
    startBlock: number,
    endBlock: number,
    address: string[] | string | undefined = undefined,
    eventSignature: string | undefined = undefined,
  ): Promise<E.Either<NetworkError, Log[]>>
  {
    const logs: Log[] = []
    const batchSize = Math.min(endBlock - startBlock + 1, this.maxBlocksPerGetLogsRequest)
    for (let i = startBlock; i <= endBlock; i += batchSize) {
      const start = i
      const end = Math.min(i + batchSize - 1, endBlock)
      let chunkLogs: Log[] = []
      try {
        chunkLogs = await retryAsync<Log[]>(
          async (): Promise<Log[]> => {
            const params: {[key: string]: unknown} = {
              fromBlock: `0x${start.toString(16)}`,
              toBlock: `0x${end.toString(16)}`,
              address,
            }
            if (eventSignature) {
              params['topics'] = [eventSignature]
            }
            return await this.jsonRpcProvider.send('eth_getLogs', [params])
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )
      } catch (e) {
        this.logger.warn(
          `Could not fetch blocks logs. cause: ${e}, startBlock: ${start}, toBlock: ${end}. Total ${end - start}`,
        )

        continue
      }

      logs.push(...chunkLogs)
    }

    return E.right(logs)
  }

  public async getLatestL2Block(): Promise<E.Either<NetworkError, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLatestL2Block.name }).startTimer()
    try {
      const block = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock('latest')
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
      // return E.right(block)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLatestL2Block.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest block`))
    }
  }

  public async getWstEthTotalSupply(l2blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWstEthTotalSupply.name }).startTimer()
    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedWstEthRunner.functions.totalSupply({
            blockTag: l2blockNumber,
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

  // public async getNotYetProcessedL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
  //   const start = new Date().getTime()
  //   const blocks = await this._fetchNotYetProcessedL2Blocks()
  //   this.logger.info(elapsedTime(this.constructor.name + '.' + this._fetchNotYetProcessedL2Blocks.name, start))

  //   return blocks
  // }

  // public async getL2LogsOrNetworkAlert(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
  //   const start = new Date().getTime()

  //   let result: E.Either<Finding, Log[]>
  //   const logs = await this.getL2Logs(
  //     workingBlocks[0].number,
  //     workingBlocks[workingBlocks.length - 1].number
  //   )
  //   if (E.isLeft(logs)) {
  //     result = E.left(
  //       networkAlert(
  //         logs.left,
  //         `Error in ${this.constructor.name}.${this.getL2Logs.name}:76`,
  //         `Could not call getL2Logs`,
  //         // workingBlocks[workingBlocks.length - 1].number,
  //       ),
  //     )
  //   } else {
  //     result = E.right(logs.right)
  //   }

  //   this.logger.info(elapsedTime(this.constructor.name + '.' + this.getL2Logs.name, start))

  //   return result
  // }

  // private async _fetchNotYetProcessedL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
  //   const out: BlockDto[] = []

  //   if (this.cachedBlockDto === undefined) {
  //     const l2Block = await this.getLatestL2Block()
  //     if (E.isLeft(l2Block)) {
  //       return E.left(
  //         networkAlert(
  //           l2Block.left,
  //           `Error in ${this.constructor.name}.${this._fetchNotYetProcessedL2Blocks.name}:21`,
  //           `Could not call l2Provider.getLatestL2Block`,
  //           0,
  //         ),
  //       )
  //     }

  //     this.cachedBlockDto = {
  //       number: l2Block.right.number,
  //       timestamp: l2Block.right.timestamp,
  //     }

  //     out.push(this.cachedBlockDto)
  //   } else {
  //     const latestL2Block = await this.getLatestL2Block()
  //     if (E.isLeft(latestL2Block)) {
  //       this.cachedBlockDto = undefined
  //       return E.left(
  //         networkAlert(
  //           latestL2Block.left,
  //           `Error in ${this.constructor.name}.${this._fetchNotYetProcessedL2Blocks.name}:39`,
  //           `Could not call l2Provider.getLatestL2Block`,
  //           0,
  //         ),
  //       )
  //     }

  //     const l2Blocks = await this.fetchL2BlocksRange(this.cachedBlockDto.number, latestL2Block.right.number - 1)
  //     for (const l2Block of l2Blocks) {
  //       out.push({
  //         number: l2Block.number,
  //         timestamp: l2Block.timestamp,
  //       })
  //     }

  //     this.cachedBlockDto = {
  //       number: latestL2Block.right.number,
  //       timestamp: latestL2Block.right.timestamp,
  //     }

  //     // hint: we requested blocks like [cachedBlockDto.number, latestBlock.number)
  //     // and here we do [cachedBlockDto.number, latestBlock.number]
  //     out.push({
  //       number: latestL2Block.right.number,
  //       timestamp: latestL2Block.right.timestamp,
  //     })
  //   }

  //   return E.right(out)
  // }

}
