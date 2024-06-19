import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import { either as E } from 'fp-ts'
import { retryAsync } from 'ts-retry'
import { ICRossChainControllerClient } from '../services/cross-chain-controller/CrossChainController.srv'
import { NetworkError } from '../utils/errors'
import { BaseAdapter__factory, CrossChainController } from '../generated'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5
const MAINNET_CHAIN_ID = 1

export class BSCProvider implements ICRossChainControllerClient {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider
  private crossChainControllerContract: CrossChainController

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider, crossChainControllerContract: CrossChainController) {
    this.jsonRpcProvider = jsonRpcProvider
    this.crossChainControllerContract = crossChainControllerContract
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

  public async getBlockNumber(argv: string[]): Promise<E.Either<Error, number>> {
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

  public async getBridgeAdaptersNamesMap(): Promise<E.Either<Error, Record<string, string | undefined>>> {
    try {
      const bridgeAdapters = await this.crossChainControllerContract.getReceiverBridgeAdaptersByChain(MAINNET_CHAIN_ID)
      const result: Record<string, string | undefined> = {}

      for (const adapterAddress of bridgeAdapters) {
        const bridgeAdapterContract = BaseAdapter__factory.connect(adapterAddress, this.jsonRpcProvider)
        try {
          const adapterName = await bridgeAdapterContract.adapterName()
          result[adapterAddress] = adapterName
        } catch (error) {
          return E.left(new NetworkError(error, `Could not get adapter name from ${adapterAddress}`))
        }
      }

      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get bridge adapters list from CrossChainController contract`))
    }
  }
}
