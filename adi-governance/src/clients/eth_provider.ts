import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { CrossChainController } from '../generated'
import { NetworkError } from '../shared/errors'
import { BlockTag } from '@ethersproject/providers'
import { IBnbAdiEthClient } from 'src/services/bnb-adi/contract'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export interface IProxyContractData {
  name: string
  shortABI: string
}

export class ETHProvider implements IBnbAdiEthClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider

  private readonly crossChainControllerContract: CrossChainController

  constructor(
    jsonRpcProvider: ethers.providers.JsonRpcProvider,

    crossChainControllerContract: CrossChainController,
  ) {
    this.jsonRpcProvider = jsonRpcProvider

    this.crossChainControllerContract = crossChainControllerContract
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
        return E.left(new NetworkError(e, `Could not fetch latest block number`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call getTransaction`))
    }
  }

  public async isSenderApproved(address: string, currentBlock: BlockTag): Promise<E.Either<Error, boolean>> {
    try {
      const result = await retryAsync(
        async (): Promise<boolean> => {
          const isApproved = await this.crossChainControllerContract.isSenderApproved(address, {
            blockTag: currentBlock,
          })

          return isApproved
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call isSenderApproved for address ${address}`))
    }
  }
}
