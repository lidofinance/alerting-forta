import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { BlockTag } from '@ethersproject/providers'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'

export abstract class IETHProvider {
  public abstract getTransaction(txHash: string): Promise<E.Either<Error, TransactionResponse>>

  public abstract getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>>

  public abstract getHistory(
    depositSecurityAddress: string,
    startBlock: number,
    endBlock: number,
  ): Promise<E.Either<Error, TransactionResponse[]>>

  public abstract getBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, EtherBigNumber>>
}

interface IEtherscanProvider {
  getHistory(
    addressOrName: string | Promise<string>,
    startBlock?: BlockTag,
    endBlock?: BlockTag,
  ): Promise<Array<TransactionResponse>>

  getBalance(addressOrName: string | Promise<string>, blockTag?: BlockTag | Promise<BlockTag>): Promise<EtherBigNumber>
}

export class ETHProvider implements IETHProvider {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider
  private etherscanProvider: IEtherscanProvider

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider, etherscanProvider: IEtherscanProvider) {
    this.jsonRpcProvider = jsonRpcProvider
    this.etherscanProvider = etherscanProvider
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

  public async getHistory(
    depositSecurityAddress: string,
    startBlock: number,
    endBlock: number,
  ): Promise<E.Either<Error, TransactionResponse[]>> {
    const out: TransactionResponse[] = []
    const batchSize = 50

    for (let i = startBlock; i <= endBlock; i += batchSize) {
      const start = i
      const end = Math.min(i + batchSize - 1, endBlock)

      let chunkTrxResp: TransactionResponse[] = []
      try {
        chunkTrxResp = await retryAsync<TransactionResponse[]>(
          async (): Promise<TransactionResponse[]> => {
            return await this.etherscanProvider.getHistory(depositSecurityAddress, start, end)
          },
          { delay: 500, maxTry: 5 },
        )
      } catch (e) {
        return E.left(new Error(`Could not fetch transaction history for last 3 days. Cause: ${e}`))
      }

      out.push(...chunkTrxResp)
    }

    return E.right(out)
  }

  public async getBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, EtherBigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.etherscanProvider.getBalance(lidoStethAddress, block)
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new Error(`Could not fetch Steth balance. cause: ${e}`))
    }
  }
}
