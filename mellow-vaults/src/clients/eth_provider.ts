import { ethers } from 'forta-agent'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { Block } from '@ethersproject/providers'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import BigNumber from 'bignumber.js'
import { NetworkError } from '../shared/errors'
import { BigNumber as EthersBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import {
  Vault__factory,
  VaultConfigurator__factory,
  SymbioticWstETH__factory,
  DefaultBondStrategy__factory,
} from '../generated'
import { VaultWatcherClient } from '../services/vault-watcher/VaultWatcher.srv'
import { MELLOW_SYMBIOTIC_ADDRESS, Storage, STORAGE_MEV_CAP, WSTETH_ADDRESS } from 'constants/common'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export interface IProxyContractData {
  name: string
  shortABI: string
}

export class ETHProvider implements VaultWatcherClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider

  constructor(jsonRpcProvider: ethers.providers.JsonRpcProvider) {
    this.jsonRpcProvider = jsonRpcProvider
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

  public async getVaultUnderlyingTvl(address: string, blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EthersBigNumber>(
        async (): Promise<EthersBigNumber> => {
          const vaultContract = Vault__factory.connect(address, this.jsonRpcProvider)

          const block = await this.jsonRpcProvider.getBlock(blockNumber)
          const [tokens, amounts] = await vaultContract.functions.underlyingTvl({
            blockTag: block.number,
          })

          const idWstETH = tokens.findIndex((token) => token.toLowerCase() === WSTETH_ADDRESS.toLowerCase())
          if (idWstETH === -1) {
            throw new Error('Could not find wstETH token in underlyingTvl')
          }

          return amounts[idWstETH]
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch getVaultUnderlyingTvl amount`))
    }
  }

  public async getVaultTotalSupply(address: string, blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EthersBigNumber>(
        async (): Promise<EthersBigNumber> => {
          const vaultContract = Vault__factory.connect(address, this.jsonRpcProvider)

          const block = await this.jsonRpcProvider.getBlock(blockNumber)
          const [totalSupply] = await vaultContract.functions.totalSupply({
            blockTag: block.number,
          })
          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch totalSupply balance`))
    }
  }

  public async getVaultPendingWithdrawersCount(
    address: string,
    blockNumber: number,
  ): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EthersBigNumber>(
        async (): Promise<EthersBigNumber> => {
          const vaultContract = Vault__factory.connect(address, this.jsonRpcProvider)

          const block = await this.jsonRpcProvider.getBlock(blockNumber)
          const [pendingWithdrawersCount] = await vaultContract.functions.pendingWithdrawersCount({
            blockTag: block.number,
          })
          return pendingWithdrawersCount
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch totalSupply balance`))
    }
  }

  public async getVaultConfiguratorMaxTotalSupply(
    address: string,
    blockNumber: number,
  ): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EthersBigNumber>(
        async (): Promise<EthersBigNumber> => {
          const vaultConfiguratorContract = VaultConfigurator__factory.connect(address, this.jsonRpcProvider)

          const block = await this.jsonRpcProvider.getBlock(blockNumber)
          const [maximalTotalSupply] = await vaultConfiguratorContract.functions.maximalTotalSupply({
            blockTag: block.number,
          })

          return maximalTotalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch ConfiguratorMaxTotalSupply balance`))
    }
  }

  public async getSymbioticWstLimit(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EthersBigNumber>(
        async (): Promise<EthersBigNumber> => {
          const symbioticWstContract = SymbioticWstETH__factory.connect(MELLOW_SYMBIOTIC_ADDRESS, this.jsonRpcProvider)

          const block = await this.jsonRpcProvider.getBlock(blockNumber)
          const [limit] = await symbioticWstContract.functions.limit({
            blockTag: block.number,
          })

          return limit
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch getVaultSymbioticWstLimit value`))
    }
  }

  public async getSymbioticWstTotalSupply(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EthersBigNumber>(
        async (): Promise<EthersBigNumber> => {
          const symbioticWstContract = SymbioticWstETH__factory.connect(MELLOW_SYMBIOTIC_ADDRESS, this.jsonRpcProvider)

          const block = await this.jsonRpcProvider.getBlock(blockNumber)
          const [totalSupply] = await symbioticWstContract.functions.totalSupply({
            blockTag: block.number,
          })

          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch SymbioticWstTotalSupply value`))
    }
  }

  public async getVaultConfigurationStorage(address: string, blockNumber: number): Promise<E.Either<Error, Storage>> {
    try {
      const out = await retryAsync<Storage>(
        async (): Promise<Storage> => {
          const vaultConfiguratorContract = VaultConfigurator__factory.connect(address, this.jsonRpcProvider)

          const block = await this.jsonRpcProvider.getBlock(blockNumber)
          const keys = Object.keys(STORAGE_MEV_CAP) as (keyof Storage)[]
          const results = await Promise.all(
            keys.map((key: keyof Storage) => vaultConfiguratorContract.functions?.[key]({ blockTag: block.number })),
          )
          const resultStr = results.map((result) => result[0].toString().toLowerCase())
          const storage: Storage = {}
          resultStr.forEach((value: string, index: number) => {
            storage[keys[index]] = value
          })
          return storage
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch getVaultConfigurationStorage`))
    }
  }

  public async getContractOwner(
    address: string,
    method: string,
    currentBlock: number,
  ): Promise<E.Either<Error, string>> {
    /*
    getContractOwner calls the method written in the ownershipMethod field in contract description
    and returns the owner of the contract address.
    */
    try {
      const members = await retryAsync(
        async (): Promise<string> => {
          const abi = [`function ${method}() view returns (address)`]
          const contract = new ethers.Contract(address, abi, this.jsonRpcProvider)
          return contract.functions[method]({ blockTag: currentBlock })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(String(members))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call ethers.Contract for address ${address}`))
    }
  }

  public async getProxyImplementation(
    address: string,
    data: IProxyContractData,
    currentBlock: number,
  ): Promise<E.Either<Error, string[]>> {
    try {
      const str = await retryAsync(
        async (): Promise<string[]> => {
          const proxyContract = new ethers.Contract(address, data.shortABI, this.jsonRpcProvider)
          if ('implementation' in proxyContract.functions) {
            return await proxyContract.functions.implementation({
              blockTag: currentBlock,
            })
          }
          if ('proxy__getImplementation' in proxyContract.functions) {
            return await proxyContract.functions.proxy__getImplementation({
              blockTag: currentBlock,
            })
          }

          throw new Error(
            `Proxy contract ${address} does not have "implementation" or "proxy__getImplementation" functions`,
          )
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      return E.right(str)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call ethers.Contract for address ${address}`))
    }
  }

  public async isDeployed(address: string, blockNumber?: number): Promise<E.Either<Error, boolean>> {
    try {
      const result = await retryAsync(
        async (): Promise<boolean> => {
          const code = await this.jsonRpcProvider.getCode(address, blockNumber)
          return code !== '0x'
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(result)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getCode for address ${address}`))
    }
  }

  public async getDefaultBondStrategyWithdrawalEvents(fromBlock: number, toBlock: number, address: string) {
    try {
      const results = await retryAsync(
        async () => {
          const keccakEvent = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes('DefaultBondStrategyProcessWithdrawals(address[],uint256)'),
          )

          return this.jsonRpcProvider.getLogs({
            fromBlock: `0x${fromBlock.toString(16)}`,
            toBlock: `0x${toBlock.toString(16)}`,
            address: address,
            topics: [keccakEvent],
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      const iface = DefaultBondStrategy__factory.createInterface()
      const out = results.map((result) => iface.parseLog(result))
      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getStonksOrderParams`))
    }
  }
}
