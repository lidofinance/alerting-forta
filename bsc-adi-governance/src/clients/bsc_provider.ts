import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import { either as E } from 'fp-ts'
import { retryAsync } from 'ts-retry'
import { ICRossChainControllerClient } from '../services/cross-chain-controller/CrossChainController.srv'
import { NetworkError } from '../utils/errors'
import { BaseAdapter__factory, CrossChainController } from '../generated'
import { CROSS_CHAIN_CONTROLLER_ADDRESS } from '../utils/constants'

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

  public async getEnvelopeStateByIds(envelopeIds: string[]): Promise<E.Either<Error, Map<string, number>>> {
    try {
      const out = new Map<string, number>()
      await Promise.all(
        envelopeIds.map(async (envelopeId) => {
          const status = await this.crossChainControllerRunner['getEnvelopeState(bytes32)'](envelopeId)
          out.set(envelopeId, status)
        }),
      )
      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not get bridge adapters list from CrossChainController contract`))
    }
  }

  public async getReceivedEnvelopeIds(fromBlock: number, toBlock: number): Promise<E.Either<Error, string[]>> {
    try {
      const results = await retryAsync(
        async () => {
          const keccakEvent = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes('TransactionReceived(bytes32,bytes32,uint256,(uint256,bytes),address,uint8)'),
          )
          const address = CROSS_CHAIN_CONTROLLER_ADDRESS
          return this.jsonRpcProvider.getLogs({
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: `0x${toBlock.toString(16)}`,
            address,
            topics: [keccakEvent, null, '0x0000000000000000000000000000000000000000000000000000000000000001', null],
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      const iface = new ethers.utils.Interface([
        'event TransactionReceived(bytes32 transactionId, bytes32 indexed envelopeId, uint256 indexed originChainId, (uint256,bytes), address indexed bridgeAdapter, uint8 confirmations)',
      ])
      const out = results.map((result) => iface.parseLog(result))
      const res: string[] = out.map((out) => out.args.envelopeId)
      return E.right(res)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getStonksOrderParams`))
    }
  }
}
