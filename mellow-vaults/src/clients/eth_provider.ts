import { ethers } from 'forta-agent'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { Block } from '@ethersproject/providers'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import BigNumber from 'bignumber.js'
import { NetworkError } from '../shared/errors'
import { BigNumber as EthersBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import { LidoDAO } from 'src/generated'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export interface IProxyContractData {
  name: string
  shortABI: string
}

export class ETHProvider {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly stethContract: LidoDAO

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider, stethContract: LidoDAO) {
    this.jsonRpcProvider = jsonRpcProvider
    this.stethContract = stethContract
  }

  public async getBlock(blockNumber: number): Promise<E.Either<Error, ethers.providers.Block>> {
    try {
      const block = await retryAsync(
        async () => {
          return await this.jsonRpcProvider.getBlock(blockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(block)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get block #${blockNumber}`))
    }
  }

  public async getLogs(filter: ethers.providers.Filter): Promise<E.Either<Error, ethers.providers.Log[]>> {
    try {
      const logs = await retryAsync(
        async () => {
          return this.jsonRpcProvider.getLogs(filter)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(logs)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get logs`))
    }
  }

  public async getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, Block>> {
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
        return E.left(new NetworkError(e, `Could not fetch latest block number`))
      }
    }

    try {
      const latestBlock = await this.jsonRpcProvider.getBlock(latestBlockNumber)
      return E.right(latestBlock)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch latest block`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call getTransaction`))
    }
  }

  public async getStethBalance(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EthersBigNumber>(
        async (): Promise<EthersBigNumber> => {
          const block = await this.jsonRpcProvider.getBlock(blockHash)
          const [balanceOf] = await this.stethContract.functions.balanceOf(address, {
            blockTag: block.number,
          })

          return balanceOf
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch aSteth balance`))
    }
  }
}
