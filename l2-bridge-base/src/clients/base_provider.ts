import { Block, Log, TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/error'
import { WithdrawalRecord } from '../entity/blockDto'
import BigNumber from 'bignumber.js'
import { Logger } from 'winston'
import { L2Bridge, WithdrawalInitiatedEvent } from '../generated/L2Bridge'

export abstract class IMonitorWithdrawalsClient {
  public abstract getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, WithdrawalInitiatedEvent[]>>

  public abstract getWithdrawalRecords(
    withdrawalEvents: WithdrawalInitiatedEvent[],
  ): Promise<E.Either<NetworkError, WithdrawalRecord[]>>
}

export abstract class IProvider {
  public abstract fetchBlocks(startBlock: number, endBlock: number): Promise<Block[]>

  public abstract getLogs(startBlock: number, endBlock: number): Promise<E.Either<NetworkError, Log[]>>

  public abstract getLatestBlock(): Promise<E.Either<NetworkError, Block>>

  public abstract getTransaction(txHash: string): Promise<E.Either<NetworkError, TransactionResponse>>

  public abstract getBlockNumber(): Promise<E.Either<NetworkError, number>>
}

export class BaseLineaProvider implements IProvider, IMonitorWithdrawalsClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly l2Bridge: L2Bridge
  private readonly logger: Logger

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider, baseTokenBridge: L2Bridge, logger: Logger) {
    this.jsonRpcProvider = jsonRpcProvider
    this.l2Bridge = baseTokenBridge
    this.logger = logger
  }

  public async fetchBlocks(startBlock: number, endBlock: number): Promise<Block[]> {
    const batchRequests = []
    for (let i = startBlock; i <= endBlock; i++) {
      batchRequests.push({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [`0x${i.toString(16)}`, false],
        id: i, // Use a unique identifier for each request
      })
    }
    const formatter = new ethers.providers.Formatter()
    const doRequest = (request: unknown[]): Promise<Block[]> => {
      return retryAsync<Block[]>(
        async (): Promise<Block[]> => {
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

          const result: Block[] = []
          const objects = (await response.json()) as unknown[]

          for (const obj of objects) {
            if (Object.prototype.hasOwnProperty.call(obj, 'result')) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              result.push(formatter.block(obj.result))
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

    const chunkSize = 15
    const out: Block[] = []

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

    return out
  }

  public async getLogs(startBlock: number, endBlock: number): Promise<E.Either<NetworkError, Log[]>> {
    const logs: Log[] = []
    const batchSize = 15

    for (let i = startBlock; i <= endBlock; i += batchSize) {
      const start = i
      const end = Math.min(i + batchSize - 1, endBlock)

      let chunkLogs: Log[] = []
      try {
        chunkLogs = await retryAsync<Log[]>(
          async (): Promise<Log[]> => {
            return await this.jsonRpcProvider.send('eth_getLogs', [
              {
                fromBlock: `0x${start.toString(16)}`,
                toBlock: `0x${end.toString(16)}`,
              },
            ])
          },
          { delay: 1000, maxTry: 5 },
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

  public async getLatestBlock(): Promise<E.Either<NetworkError, Block>> {
    try {
      const out = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock('latest')
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch latest block`))
    }
  }

  public async getTransaction(txHash: string): Promise<E.Either<NetworkError, TransactionResponse>> {
    try {
      const out = await retryAsync<TransactionResponse>(
        async (): Promise<TransactionResponse> => {
          const tx = await this.jsonRpcProvider.getTransaction(txHash)

          if (!tx) {
            throw new NetworkError(`Can't find transaction ${txHash}`)
          }

          if (tx.blockNumber === undefined) {
            throw new NetworkError(`Transaction ${txHash} was not yet included into block`)
          }

          return tx
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch transaction`))
    }
  }

  public async getBlockNumber(): Promise<E.Either<NetworkError, number>> {
    try {
      const out = await retryAsync<number>(
        async (): Promise<number> => {
          return await this.jsonRpcProvider.getBlockNumber()
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch latest getBlockNumber`))
    }
  }

  public async getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, WithdrawalInitiatedEvent[]>> {
    const fetchEvents = (start: number, end: number): Promise<WithdrawalInitiatedEvent[]> => {
      return retryAsync<WithdrawalInitiatedEvent[]>(
        async (): Promise<WithdrawalInitiatedEvent[]> => {
          return await this.l2Bridge.queryFilter(this.l2Bridge.filters.WithdrawalInitiated(), start, end)
        },
        { delay: 500, maxTry: 5 },
      )
    }

    const batchRequests: number[] = []
    for (let i = fromBlockNumber; i <= toBlockNumber; i++) {
      batchRequests.push(i)
    }

    const chunkSize = 125
    const out: WithdrawalInitiatedEvent[] = []

    const batchPromises: Promise<WithdrawalInitiatedEvent[]>[] = []

    for (let i = 0; i < batchRequests.length; i += chunkSize) {
      const request = batchRequests.slice(i, i + chunkSize)
      batchPromises.push(fetchEvents(request[0], request[request.length - 1]))
    }

    try {
      await Promise.all(batchPromises)

      const arrayOfEvents = await Promise.all(batchPromises)
      for (const events of arrayOfEvents) {
        out.push(...events)
      }

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch Withdrawal initiated events`))
    }
  }

  public async getWithdrawalRecords(
    withdrawalEvents: WithdrawalInitiatedEvent[],
  ): Promise<E.Either<NetworkError, WithdrawalRecord[]>> {
    const out: WithdrawalRecord[] = []

    for (const withdrawEvent of withdrawalEvents) {
      if (withdrawEvent.args) {
        let block: Block
        try {
          block = await retryAsync<Block>(
            async (): Promise<Block> => {
              return await withdrawEvent.getBlock()
            },
            { delay: 500, maxTry: 5 },
          )

          const record: WithdrawalRecord = {
            time: block.timestamp,
            amount: new BigNumber(String(withdrawEvent.args.amount)),
          }

          out.push(record)
        } catch (e) {
          return E.left(new NetworkError(e, `Could not fetch block from withdrawEvent`))
        }
      }
    }

    return E.right(out)
  }
}
