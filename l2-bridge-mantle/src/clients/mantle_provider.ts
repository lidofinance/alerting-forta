import { Block, Log, TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'

interface BlockResponse {
  jsonrpc: string
  id: number
  result: Block
}

export abstract class IMantleProvider {
  public abstract fetchBlocks(startBlock: number, endBlock: number): Promise<Block[]>

  public abstract getLogs(startBlock: number, endBlock: number): Promise<Log[]>

  public abstract getLatestBlock(): Promise<Block>

  public abstract getTransaction(txHash: string): Promise<TransactionResponse>

  public abstract getBlockNumber(): Promise<number>

  public abstract getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>>
}

export class MantleProvider implements IMantleProvider {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider) {
    this.jsonRpcProvider = jsonRpcProvider
  }

  public async fetchBlocks(startBlock: number, endBlock: number): Promise<Block[]> {
    const batchRequests = []
    const out: Block[] = []
    for (let i = startBlock; i <= endBlock; i++) {
      batchRequests.push({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [`0x${i.toString(16)}`, false],
        id: i, // Use a unique identifier for each request
      })
    }

    const response = await fetch(this.jsonRpcProvider.connection.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchRequests),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const results: BlockResponse[] = await response.json()

    const formatter = new ethers.providers.Formatter()

    for (const result of results) {
      out.push(formatter.block(result.result))
    }

    return out
  }

  public async getLogs(startBlock: number, endBlock: number): Promise<Log[]> {
    return await this.jsonRpcProvider.send('eth_getLogs', [
      {
        fromBlock: `0x${startBlock.toString(16)}`,
        toBlock: `0x${endBlock.toString(16)}`,
      },
    ])
  }

  public async getLatestBlock(): Promise<Block> {
    return await this.jsonRpcProvider.getBlock('latest')
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
        return E.left(Error(`Can't find transaction ${txHash}`))
      }
      if (!tx.blockNumber) {
        return E.left(Error(`Transaction ${txHash} was not yet included into block`))
      }
      latestBlockNumber = tx.blockNumber
    }

    if (latestBlockNumber == -1) {
      try {
        latestBlockNumber = await this.jsonRpcProvider.getBlockNumber()
      } catch (e) {
        return E.left(Error(`Could not fetch latest block number. cause: ${e}`))
      }
    }

    return E.right(latestBlockNumber)
  }
}
