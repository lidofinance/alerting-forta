import { Block, Log, TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'

interface BlockResponse {
  jsonrpc: string
  id: number
  result: Block
}

export abstract class IMantleProvider {
  public abstract fetchBlocks(startBlock: number, endBlock: number): Promise<E.Either<Error, Block[]>>

  public abstract getLogs(startBlock: number, endBlock: number): Promise<E.Either<Error, Log[]>>

  public abstract getLatestBlock(): Promise<E.Either<Error, Block>>

  public abstract getTransaction(txHash: string): Promise<TransactionResponse>

  public abstract getBlockNumber(): Promise<number>

  public abstract getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>>
}

export class MantleProvider implements IMantleProvider {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider) {
    this.jsonRpcProvider = jsonRpcProvider
  }

  public async fetchBlocks(startBlock: number, endBlock: number): Promise<E.Either<Error, Block[]>> {
    try {
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

        const response = await retryAsync<Response>(
          async (): Promise<Response> => {
            const response = await fetch(this.jsonRpcProvider.connection.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request),
            })

            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}, request: ${request}`)
            }

            return response
          },
          { delay: 500, maxTry: 5 },
        )

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const results: BlockResponse[] = await response.json()

        const formatter = new ethers.providers.Formatter()

        for (const result of results) {
          if (result.result === null) {
            for (const r of request) {
              if (r.id === result.id) {
                console.log(
                  `Warning: missed response from node by reqId: ${result.id}, request: ${r.params.toString()}`,
                )
              }
            }

            continue
          }

          out.push(formatter.block(result.result))
        }
      }

      return E.right(out)
    } catch (e) {
      return E.left(
        new Error(`Could not fetch blocks number. cause: ${e}, startBlock: ${startBlock}, endBlock: ${endBlock}`),
      )
    }
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
        return E.left(new Error(`Could not fetch blocks logs. cause: ${e}, startBlock: ${start}, toBlock: ${end}`))
      }

      logs.push(...chunkLogs)
    }

    return E.right(logs)
  }

  public async getLatestBlock(): Promise<E.Either<Error, Block>> {
    try {
      const out = await this.jsonRpcProvider.getBlock('latest')
      return E.right(out)
    } catch (e) {
      return E.left(new Error(`Could not fetch latest block number. cause: ${e}`))
    }
  }

  public async getTransaction(txHash: string): Promise<TransactionResponse> {
    return await this.jsonRpcProvider.getTransaction(txHash)
  }

  public async getBlockNumber(): Promise<number> {
    return await this.jsonRpcProvider.getBlockNumber()
  }

  public async getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>> {
    let latestBlockNumber: number = -1

    if (argv.includes('--block')) {
      latestBlockNumber = parseInt(argv[4])
    } else if (argv.includes('--range')) {
      latestBlockNumber = parseInt(argv[4].slice(0, argv[4].indexOf('.')))
    } else if (argv.includes('--tx')) {
      const txHash = argv[4]
      const tx = await this.jsonRpcProvider.getTransaction(txHash)
      if (!tx) {
        return E.left(new Error(`Can't find transaction ${txHash}`))
      }
      if (!tx.blockNumber) {
        return E.left(new Error(`Transaction ${txHash} was not yet included into block`))
      }
      latestBlockNumber = tx.blockNumber
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
