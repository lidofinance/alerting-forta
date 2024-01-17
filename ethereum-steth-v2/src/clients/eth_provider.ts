import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { BlockTag } from '@ethersproject/providers'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import { StakingLimitInfo } from '../entity/stakingLimitInfo'
import {
  GateSeal as GateSealContract,
  Lido as LidoContract,
  ValidatorsExitBusOracle as ExitBusContract,
  WithdrawalQueueERC721 as WithdrawalQueueContract,
} from '../generated'
import { WithdrawalQueueBase } from '../generated/WithdrawalQueueERC721'
import { GateSeal, GateSealExpiredErr } from '../entity/gate_seal'
import { ETHDistributedEvent } from '../generated/Lido'
import { DataRW } from '../utils/mutex'

export abstract class IETHProvider {
  public abstract getTransaction(txHash: string): Promise<E.Either<Error, TransactionResponse>>

  public abstract getStartedBlockForApp(argv: string[]): Promise<E.Either<Error, number>>

  public abstract getHistory(
    depositSecurityAddress: string,
    startBlock: number,
    endBlock: number,
  ): Promise<E.Either<Error, TransactionResponse[]>>

  public abstract getStethBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getBalanceByBlockHash(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>>

  public abstract getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>>

  public abstract getUnfinalizedStETH(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getWithdrawalStatuses(
    requestsRange: number[],
    currentBlock: number,
  ): Promise<E.Either<Error, WithdrawalQueueBase.WithdrawalRequestStatusStructOutput[]>>

  public abstract getBufferedEther(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract checkGateSeal(blockNumber: number, gateSealAddress: string): Promise<E.Either<Error, GateSeal>>

  public abstract getExpiryTimestamp(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getETHDistributedEvent(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, ETHDistributedEvent | null>>
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

  private readonly lidoContract: LidoContract
  private readonly wdQueueContract: WithdrawalQueueContract
  private readonly exitBusContract: ExitBusContract
  private gateSeal: GateSealContract

  constructor(
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    etherscanProvider: IEtherscanProvider,
    lidoContract: LidoContract,
    wdQueueContract: WithdrawalQueueContract,
    gateSeal: GateSealContract,
    exitBusContract: ExitBusContract,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.etherscanProvider = etherscanProvider
    this.lidoContract = lidoContract
    this.wdQueueContract = wdQueueContract
    this.gateSeal = gateSeal
    this.exitBusContract = exitBusContract
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
    const fetchBatch = async (start: number, end: number): Promise<TransactionResponse[]> => {
      try {
        return await retryAsync<TransactionResponse[]>(
          async (): Promise<TransactionResponse[]> => {
            return await this.etherscanProvider.getHistory(depositSecurityAddress, start, end)
          },
          { delay: 500, maxTry: 5 },
        )
      } catch (e) {
        throw new Error(`Could not fetch transaction history between ${start} and ${end} blocks. Cause: ${e}`)
      }
    }

    const batchPromises: Promise<void>[] = []
    const out = new DataRW<TransactionResponse>([])
    // const out: TransactionResponse[] = []
    const batchSize = 10_000

    for (let i = startBlock; i <= endBlock; i += batchSize) {
      const start = i
      const end = Math.min(i + batchSize - 1, endBlock)

      const promise = fetchBatch(start, end).then((chunkTrxResp) => {
        out.write(chunkTrxResp)
      })

      batchPromises.push(promise)
    }
    console.log('Info: count history requests: ', batchPromises.length)

    try {
      await Promise.all(batchPromises)

      return E.right(await out.read())
    } catch (error) {
      return E.left(new Error(`Could not fetch transaction history for last 3 days. Cause ${error}`))
    }
  }

  public async getStethBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.etherscanProvider.getBalance(lidoStethAddress, block)
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new Error(`Could not fetch Steth balance. cause: ${e}`))
    }
  }

  public async getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.jsonRpcProvider.getBalance(address, block)
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new Error(`Could not fetch balance by address ${address}. cause: ${e}`))
    }
  }

  public async getBalanceByBlockHash(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.jsonRpcProvider.getBalance(address, {
            blockHash: blockHash,
          } as never)
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new Error(`Could not fetch balance by address ${address} and blockHash ${blockHash}. cause: ${e}`))
    }
  }

  public async getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>> {
    try {
      const out = await retryAsync<StakingLimitInfo>(
        async (): Promise<StakingLimitInfo> => {
          const resp = await this.lidoContract.functions.getStakeLimitFullInfo({
            blockTag: blockNumber,
          })

          return {
            currentStakeLimit: new BigNumber(String(resp.currentStakeLimit)).div(ETH_DECIMALS),
            maxStakeLimit: new BigNumber(String(resp.maxStakeLimit)).div(ETH_DECIMALS),
            isStakingPaused: resp.isStakingPaused,
          }
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new Error(`Could not call "lidoContract.getStakeLimitFullInfo. Cause ${e}`))
    }
  }

  public async getUnfinalizedStETH(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<BigNumber>(
        async (): Promise<BigNumber> => {
          const out = await this.wdQueueContract.unfinalizedStETH({
            blockTag: blockNumber,
          })

          return new BigNumber(String(out))
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new Error(`Could not call "wdQueueContract.unfinalizedStETH. Cause ${e}`))
    }
  }

  public async getWithdrawalStatuses(
    requestsRange: number[],
    currentBlock: number,
  ): Promise<E.Either<Error, WithdrawalQueueBase.WithdrawalRequestStatusStructOutput[]>> {
    const fetchStatusesChunk = async (
      request: number[],
    ): Promise<WithdrawalQueueBase.WithdrawalRequestStatusStructOutput[]> => {
      try {
        return await retryAsync<WithdrawalQueueBase.WithdrawalRequestStatusStructOutput[]>(
          async (): Promise<WithdrawalQueueBase.WithdrawalRequestStatusStructOutput[]> => {
            const resp = await this.wdQueueContract.functions.getWithdrawalStatus(request, {
              blockTag: currentBlock,
            })

            return resp.statuses
          },
          { delay: 500, maxTry: 5 },
        )
      } catch (e) {
        throw new Error(
          `Could not call "getWithdrawalStatus between  ${request[0]} and ${request[request.length - 1]}. Total: ${
            request.length
          }. Cause ${e} `,
        )
      }
    }

    const chunkPromises: Promise<void>[] = []
    const MAX_REQUESTS_CHUNK_SIZE = 1750
    const out = new DataRW<WithdrawalQueueBase.WithdrawalRequestStatusStructOutput>([])

    for (let i = 0; i < requestsRange.length; i += MAX_REQUESTS_CHUNK_SIZE) {
      const requestChunk = requestsRange.slice(i, i + MAX_REQUESTS_CHUNK_SIZE)

      const promise = fetchStatusesChunk(requestChunk).then((statuses) => {
        out.write(statuses)
      })

      chunkPromises.push(promise)
    }
    console.log('Info: count withdrawals requests: ', chunkPromises.length)

    try {
      await Promise.all(chunkPromises)
      return E.right(await out.read())
    } catch (error) {
      return E.left(error as Error)
    }
  }

  public async getBufferedEther(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const resp = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoContract.getBufferedEther({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(new BigNumber(resp.toString()))
    } catch (e) {
      return E.left(new Error(`Could not call "lidoContract.getBufferedEther". Cause: ${e}`))
    }
  }

  public async checkGateSeal(blockNumber: number, gateSealAddress: string): Promise<E.Either<Error, GateSeal>> {
    const isExpired = await this.isGateSealExpired(blockNumber, gateSealAddress)
    if (E.isLeft(isExpired)) {
      return E.left(isExpired.left)
    }

    if (isExpired.right) {
      return E.left(GateSealExpiredErr)
    }

    const [isGateSealHasPauseRole, isGateSealHasExitBusPauseRoleMember] = await Promise.all([
      this.isGateSealHasPauseRole(blockNumber, gateSealAddress),
      this.isGateSealHasExitBusPauseRoleMember(blockNumber, gateSealAddress),
    ])

    if (E.isLeft(isGateSealHasPauseRole)) {
      return E.left(isGateSealHasPauseRole.left)
    }

    if (E.isLeft(isGateSealHasExitBusPauseRoleMember)) {
      return E.left(isGateSealHasExitBusPauseRoleMember.left)
    }

    const out: GateSeal = {
      roleForWithdrawalQueue: isGateSealHasPauseRole.right,
      roleForExitBus: isGateSealHasExitBusPauseRoleMember.right,
      exitbusOracleAddress: this.exitBusContract.address,
      withdrawalQueueAddress: this.wdQueueContract.address,
    }

    return E.right(out)
  }

  public async getExpiryTimestamp(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const expiryTimestamp = await retryAsync<BigNumber>(
        async (): Promise<BigNumber> => {
          const [resp] = await this.gateSeal.functions.get_expiry_timestamp({
            blockTag: blockNumber,
          })

          return new BigNumber(String(resp))
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(expiryTimestamp)
    } catch (e) {
      return E.left(new Error(`Could not call "gateSeal.functions.get_expiry_timestamp". Cause: ${e}`))
    }
  }

  public async getETHDistributedEvent(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, ETHDistributedEvent | null>> {
    try {
      const report = await retryAsync<ETHDistributedEvent | null>(
        async (): Promise<ETHDistributedEvent | null> => {
          const [resp] = await this.lidoContract.queryFilter(
            this.lidoContract.filters.ETHDistributed(),
            fromBlockNumber,
            toBlockNumber,
          )

          if (resp === undefined) {
            return null
          }

          return resp
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(report)
    } catch (e) {
      return E.left(new Error(`Could not call "this.lidoContract.filters.ETHDistributed". Cause: ${e}`))
    }
  }

  private async isGateSealExpired(blockNumber: number, gateSealAddress: string): Promise<E.Either<Error, boolean>> {
    this.gateSeal = this.gateSeal.attach(gateSealAddress)

    try {
      const isExpired = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [resp] = await this.gateSeal.functions.is_expired({
            blockTag: blockNumber,
          })

          return resp
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(isExpired)
    } catch (e) {
      return E.left(new Error(`Could not call "gateSeal.functions.is_expired". Cause: ${e}`))
    }
  }

  private async isGateSealHasPauseRole(
    blockNumber: number,
    gateSealAddress: string,
  ): Promise<E.Either<Error, boolean>> {
    const keccakPauseRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSE_ROLE'))

    try {
      const queuePauseRoleMember = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [resp] = await this.wdQueueContract.functions.hasRole(keccakPauseRole, gateSealAddress, {
            blockTag: blockNumber,
          })

          return resp
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(queuePauseRoleMember)
    } catch (e) {
      return E.left(new Error(`Could not call "wdQueueContract.functions.hasRole". Cause: ${e}`))
    }
  }

  private async isGateSealHasExitBusPauseRoleMember(
    blockNumber: number,
    gateSealAddress: string,
  ): Promise<E.Either<Error, boolean>> {
    const keccakPauseRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSE_ROLE'))

    try {
      const exitBusPauseRoleMember = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [resp] = await this.exitBusContract.functions.hasRole(keccakPauseRole, gateSealAddress, {
            blockTag: blockNumber,
          })

          return resp
        },
        { delay: 500, maxTry: 5 },
      )

      return E.right(exitBusPauseRoleMember)
    } catch (e) {
      return E.left(new Error(`Could not call "this.exitBusContract.functions.hasRole". Cause: ${e}`))
    }
  }
}
