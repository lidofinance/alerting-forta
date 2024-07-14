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
  private crossChainControllerRunner: CrossChainController

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider, crossChainControllerRunner: CrossChainController) {
    this.jsonRpcProvider = jsonRpcProvider
    this.crossChainControllerRunner = crossChainControllerRunner
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

  public async getBlockNumber(): Promise<E.Either<Error, number>> {
    try {
      const latestBlockNumber = await this.jsonRpcProvider.getBlockNumber()
      return E.right(latestBlockNumber)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch latest block number`))
    }
  }

  public async getBridgeAdapters(): Promise<E.Either<Error, string[]>> {
    try {
      const bridgeAdapters = await this.crossChainControllerRunner.getReceiverBridgeAdaptersByChain(MAINNET_CHAIN_ID)
      return E.right(bridgeAdapters)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get bridge adapters list from CrossChainController contract`))
    }
  }

  public async getBridgeAdaptersNamesMap(): Promise<E.Either<Error, Map<string, string>>> {
    try {
      const bridgeAdapters = await this.getBridgeAdapters()
      if (E.isLeft(bridgeAdapters)) {
        return E.left(bridgeAdapters.left)
      }
      const result = new Map<string, string>()

      for (const adapterAddress of bridgeAdapters.right) {
        const bridgeAdapterContract = BaseAdapter__factory.connect(adapterAddress, this.jsonRpcProvider)
        try {
          const adapterName = await bridgeAdapterContract.adapterName()
          result.set(adapterAddress, adapterName)
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
