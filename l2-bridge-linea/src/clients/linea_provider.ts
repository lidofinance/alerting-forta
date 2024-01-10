import { Block, Log, TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'

interface BlockResponse {
  jsonrpc: string
  id: number
  result: Block
}

export abstract class ILineaProvider {
  public abstract fetchBlocks(startBlock: number, endBlock: number): Promise<E.Either<Error, Block[]>>

  public abstract getLogs(startBlock: number, endBlock: number): Promise<E.Either<Error, Log[]>>

  public abstract getLatestBlock(): Promise<E.Either<Error, Block>>

  public abstract getTransaction(txHash: string): Promise<E.Either<Error, TransactionResponse>>

  public abstract getBlockNumber(): Promise<E.Either<Error, number>>

  public abstract getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>>
}

export class LineaProvider implements ILineaProvider {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider) {
    this.jsonRpcProvider = jsonRpcProvider
  }

  public async fetchBlocks(startBlock: number, endBlock: number): Promise<E.Either<Error, Block[]>> {
    const batchRequests = []
    for (let i = startBlock; i <= endBlock; i++) {
      batchRequests.push({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [`0x${i.toString(16)}`, false],
        id: i, // Use a unique identifier for each request
      })
    }
    const chunkSize = 15
    const out: Block[] = []

    for (let i = 0; i < batchRequests.length; i += chunkSize) {
      const request = batchRequests.slice(i, i + chunkSize)
      let response: Response
      try {
        response = await retryAsync<Response>(
          async (): Promise<Response> => {
            const out = await fetch(this.jsonRpcProvider.connection.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request),
            })

            if (!out.ok) {
              throw new Error(`HTTP error! Status: ${out.status}, request: ${request}`)
            }

            return out
          },
          { delay: 500, maxTry: 5 },
        )
      } catch (e) {
        console.log(
          `Warning: Could not fetch blocks number. cause: ${e}, startBlock: ${startBlock}, endBlock: ${endBlock}. Total: ${
            endBlock - startBlock
          }`,
        )
        continue
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const results: BlockResponse[] = await response.json()

      const formatter = new ethers.providers.Formatter()

      for (const result of results) {
        if (result.result === null) {
          for (const r of request) {
            if (r.id === result.id) {
              console.log(`Warning: missed response from node by reqId: ${result.id}, request: ${r.params.join(', ')}`)
            }
          }

          continue
        }

        out.push(formatter.block(result.result))
      }
    }

    return E.right(out)
  }

  public async getLogs(startBlock: number, endBlock: number): Promise<E.Either<Error, Log[]>> {
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
          { delay: 500, maxTry: 5 },
        )
      } catch (e) {
        console.log(
          `Warning: Could not fetch blocks logs. cause: ${e}, startBlock: ${start}, toBlock: ${end}. Total ${
            end - start
          }`,
        )
        continue
      }

      logs.push(...chunkLogs)
    }

    return E.right(logs)
  }

  public async getLatestBlock(): Promise<E.Either<Error, Block>> {
    try {
      const out = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock('latest')
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new Error(`Could not fetch latest block. cause: ${e}`))
    }
  }

  public async getTransaction(txHash: string): Promise<E.Either<Error, TransactionResponse>> {
    try {
      const out = await retryAsync<TransactionResponse>(
        async (): Promise<TransactionResponse> => {
          const tx = await this.jsonRpcProvider.getTransaction(txHash)

          if (!tx) {
            throw new Error(`Can't find transaction ${txHash}`)
          }

          if (tx.blockNumber === undefined) {
            throw new Error(`Transaction ${txHash} was not yet included into block`)
          }

          return tx
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new Error(`Could not fetch transaction. cause: ${e}`))
    }
  }

  public async getBlockNumber(): Promise<E.Either<Error, number>> {
    try {
      const out = await retryAsync<number>(
        async (): Promise<number> => {
          return await this.jsonRpcProvider.getBlockNumber()
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new Error(`Could not fetch latest getBlockNumber. cause: ${e}`))
    }
  }

  public async getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>> {
    let latestBlockNumber: number = -1

    if (argv.includes('--block')) {
      latestBlockNumber = parseInt(argv[4])
    } else if (argv.includes('--range')) {
      latestBlockNumber = parseInt(argv[4].slice(0, argv[4].indexOf('.')))
    } else if (argv.includes('--tx')) {
      const txHash = argv[4]
      const tx = await this.getTransaction(txHash)
      if (E.isLeft(tx)) {
        return E.left(tx.left)
      }

      if (tx.right.blockNumber !== undefined) {
        latestBlockNumber = tx.right.blockNumber
      }
    }
    if (latestBlockNumber == -1) {
      try {
        latestBlockNumber = await this.jsonRpcProvider.getBlockNumber()
      } catch (e) {
        return E.left(new Error(`Could not fetch latest block number. cause: ${e}`))
      }
    }

    return E.right(latestBlockNumber)
  }
}
