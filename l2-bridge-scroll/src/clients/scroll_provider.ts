import { Block, Log } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { NetworkError } from '../utils/error'
import { WithdrawERC20Event, L2LidoGateway } from '../generated/L2LidoGateway'
import { WithdrawalRecord } from '../entity/blockDto'
import BigNumber from 'bignumber.js'
<<<<<<<< HEAD:l2-bridge-scroll/src/clients/scroll_provider.ts
import { Logger } from 'winston'
import { IL2BridgeBalanceClient } from '../services/bridge_balance'
import { ERC20Short as BridgedWstEthRunner } from '../generated'
import { IScrollProvider } from './scroll_block_client'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5
========
import { WithdrawalInitiatedEvent } from '../generated/L2ERC20Bridge'
import { IL2BridgeBalanceClient } from '../services/bridge_balance'
import { ERC20Short as BridgedWstEthRunner, L2ERC20Bridge as ZkSyncL2BridgeRunner } from '../generated'
>>>>>>>> main:l2-bridge-zksync/src/clients/zksync_client.ts

export abstract class IMonitorWithdrawalsClient {
  public abstract getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, WithdrawERC20Event[]>>

  public abstract getWithdrawalRecords(
    withdrawalEvents: WithdrawERC20Event[],
  ): Promise<E.Either<NetworkError, WithdrawalRecord[]>>
}

<<<<<<<< HEAD:l2-bridge-scroll/src/clients/scroll_provider.ts
export class ScrollProvider implements IScrollProvider, IMonitorWithdrawalsClient, IL2BridgeBalanceClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly scrollTokenBridge: L2LidoGateway
  private readonly logger: Logger
========
export abstract class IZkSyncClient {
  public abstract fetchL2Blocks(startBlock: number, endBlock: number): Promise<Block[]>

  public abstract getL2Logs(startBlock: number, endBlock: number): Promise<E.Either<NetworkError, Log[]>>

  public abstract getLatestL2Block(): Promise<E.Either<NetworkError, Block>>
}

export class ZkSyncClient implements IZkSyncClient, IMonitorWithdrawalsClient, IL2BridgeBalanceClient {
  private readonly logger: Logger
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly zkSyncL2BridgeRunner: ZkSyncL2BridgeRunner
>>>>>>>> main:l2-bridge-zksync/src/clients/zksync_client.ts
  private readonly bridgedWstEthRunner: BridgedWstEthRunner

  constructor(
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
<<<<<<<< HEAD:l2-bridge-scroll/src/clients/scroll_provider.ts
    scrollTokenBridge: L2LidoGateway,
    logger: Logger,
========
    logger: Logger,
    zkSyncL2BridgeRunner: ZkSyncL2BridgeRunner,
>>>>>>>> main:l2-bridge-zksync/src/clients/zksync_client.ts
    bridgedWstEthRunner: BridgedWstEthRunner,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.scrollTokenBridge = scrollTokenBridge
    this.logger = logger
<<<<<<<< HEAD:l2-bridge-scroll/src/clients/scroll_provider.ts
========
    this.zkSyncL2BridgeRunner = zkSyncL2BridgeRunner
>>>>>>>> main:l2-bridge-zksync/src/clients/zksync_client.ts
    this.bridgedWstEthRunner = bridgedWstEthRunner
  }

  public async fetchL2Blocks(startBlock: number, endBlock: number): Promise<Block[]> {
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

    const chunkSize = 25
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

    return out.toSorted((a, b) => a.number - b.number)
  }

  public async getL2Logs(startBlock: number, endBlock: number): Promise<E.Either<NetworkError, Log[]>> {
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

  public async getLatestL2Block(): Promise<E.Either<NetworkError, Block>> {
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

  public async getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, WithdrawERC20Event[]>> {
    try {
<<<<<<<< HEAD:l2-bridge-scroll/src/clients/scroll_provider.ts
      const out = await retryAsync<WithdrawERC20Event[]>(
        async (): Promise<WithdrawERC20Event[]> => {
          return await this.scrollTokenBridge.queryFilter(
            this.scrollTokenBridge.filters.WithdrawERC20(),
========
      const out = await retryAsync<WithdrawalInitiatedEvent[]>(
        async (): Promise<WithdrawalInitiatedEvent[]> => {
          return await this.zkSyncL2BridgeRunner.queryFilter(
            this.zkSyncL2BridgeRunner.filters.WithdrawalInitiated(),
>>>>>>>> main:l2-bridge-zksync/src/clients/zksync_client.ts
            fromBlockNumber,
            toBlockNumber,
          )
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch withdrawEvents`))
    }
  }

  public async getWithdrawalRecords(
    withdrawalEvents: WithdrawERC20Event[],
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
            timestamp: block.timestamp,
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

  public async getWstEthTotalSupply(l2blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedWstEthRunner.functions.totalSupply({
            blockTag: l2blockNumber,
          })

          return balance.toString()
        },
<<<<<<<< HEAD:l2-bridge-scroll/src/clients/scroll_provider.ts
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
========
        { delay: 500, maxTry: 5 },
>>>>>>>> main:l2-bridge-zksync/src/clients/zksync_client.ts
      )

      return E.right(new BigNumber(out))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call bridgedWstEthRunner.functions.totalSupply`))
    }
  }
}
