import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import { StakingLimitInfo } from '../entity/staking_limit_info'
import {
  GateSeal as GateSealContract,
  Lido as LidoContract,
  ValidatorsExitBusOracle as ExitBusContract,
  WithdrawalQueueERC721 as WithdrawalQueueContract,
} from '../generated'
import { GateSeal, GateSealExpiredErr } from '../entity/gate_seal'
import { ETHDistributedEvent } from '../generated/Lido'
import { DataRW } from '../utils/mutex'
import { IEtherscanProvider } from './contracts'
import { WithdrawalRequest } from '../entity/withdrawal_request'
import { TypedEvent } from '../generated/common'
import { NetworkError } from '../utils/errors'
import { IGateSealClient } from '../services/gate-seal/contract'
import { IStethClient } from '../services/steth_operation/contracts'
import { IVaultClient } from '../services/vault/contract'
import { IWithdrawalsClient } from '../services/withdrawals/contract'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class ETHProvider implements IGateSealClient, IStethClient, IVaultClient, IWithdrawalsClient {
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
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )
      } catch (err) {
        throw new NetworkError(err, `Could not fetch transaction history between ${start} and ${end} blocks`)
      }
    }

    const batchPromises: Promise<void>[] = []
    const out = new DataRW<TransactionResponse>([])
    const batchSize = 10_000

    for (let i = startBlock; i <= endBlock; i += batchSize) {
      const start = i
      const end = Math.min(i + batchSize - 1, endBlock)

      const promise = fetchBatch(start, end).then((chunkTrxResp) => {
        out.write(chunkTrxResp)
      })

      batchPromises.push(promise)
    }

    try {
      await Promise.all(batchPromises)

      return E.right(await out.read())
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch transaction history`))
    }
  }

  public async getStethBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.etherscanProvider.getBalance(lidoStethAddress, block)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch Steth balance`))
    }
  }

  public async getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.jsonRpcProvider.getBalance(address, block)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch balance by address ${address}`))
    }
  }

  public async getBalanceByBlockHash(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.jsonRpcProvider.getBalance(address, blockHash)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not fetch balance by address ${address} and blockHash ${blockHash}`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call lidoContract.getStakeLimitFullInfo`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wdQueueContract.unfinalizedStETH`))
    }
  }

  public async getWithdrawalStatuses(
    requestsRange: number[],
    currentBlock: number,
  ): Promise<E.Either<Error, WithdrawalRequest[]>> {
    const fetchStatusesChunk = async (requestIds: number[], blockNumber: number): Promise<WithdrawalRequest[]> => {
      try {
        return await retryAsync<WithdrawalRequest[]>(
          async (): Promise<WithdrawalRequest[]> => {
            const resp = await this.wdQueueContract.functions.getWithdrawalStatus(requestIds, {
              blockTag: blockNumber,
            })

            const out: WithdrawalRequest[] = []
            for (let i = 0; i < requestIds.length; i++) {
              const requestId = requestIds[i]

              const requestStatus = resp.statuses[i]
              const withdrawalRequest = WithdrawalRequest.toWithdrawalRequest(requestStatus, requestId)
              out.push(withdrawalRequest)
            }

            return out
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )
      } catch (e) {
        throw new NetworkError(
          e,
          `Could not call wdQueueContract.getWithdrawalStatus on ${blockNumber} between ${requestIds[0]} and ${
            requestIds[requestIds.length - 1]
          }. Total: ${requestIds.length}`,
        )
      }
    }

    const chunkPromises: Promise<void>[] = []
    const MAX_REQUESTS_CHUNK_SIZE = 1750
    const out = new DataRW<WithdrawalRequest>([])

    for (let i = 0; i < requestsRange.length; i += MAX_REQUESTS_CHUNK_SIZE) {
      const requestChunk = requestsRange.slice(i, i + MAX_REQUESTS_CHUNK_SIZE)

      const promise = fetchStatusesChunk(requestChunk, currentBlock).then((statuses) => {
        out.write(statuses)
      })

      chunkPromises.push(promise)
    }

    try {
      await Promise.all(chunkPromises)
      return E.right(await out.read())
    } catch (e) {
      return E.left(new NetworkError(e))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(resp.toString()))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call lidoContract.getBufferedEther`))
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
      exitBusOracleAddress: this.exitBusContract.address,
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(expiryTimestamp)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call gateSeal.functions.get_expiry_timestamp`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(report)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call this.lidoContract.filters.ETHDistributed"`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(isExpired)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call gateSeal.functions.is_expired`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(queuePauseRoleMember)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wdQueueContract.functions.hasRole`))
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
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(exitBusPauseRoleMember)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call this.exitBusContract.functions.hasRole`))
    }
  }

  public async getTotalPooledEther(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoContract.getTotalPooledEther({
            blockTag: blockNumber,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call this.getTotalPooledEther`))
    }
  }

  public async getTotalShares(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoContract.getTotalShares({
            blockTag: blockNumber,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call lidoContract.getTotalShares`))
    }
  }

  public async getShareRate(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const [totalPooledEth, totalShares] = await Promise.all([
      this.getTotalPooledEther(blockNumber),
      this.getTotalShares(blockNumber),
    ])

    if (E.isLeft(totalPooledEth)) {
      return E.left(totalPooledEth.left)
    }

    if (E.isLeft(totalShares)) {
      return E.left(totalShares.left)
    }
    // Formula: shareRate = (totalPooledEth * 10**27) / totalShares
    return E.right(totalPooledEth.right.multipliedBy(new BigNumber(10).pow(27)).div(totalShares.right))
  }

  public async isBunkerModeActive(blockNumber: number): Promise<E.Either<Error, boolean>> {
    try {
      const isBunkerMode = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [isBunkerMode] = await this.wdQueueContract.functions.isBunkerModeActive({
            blockTag: blockNumber,
          })

          return isBunkerMode
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(isBunkerMode)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wdQueueContract.isBunkerModeActive`))
    }
  }

  public async getBunkerTimestamp(blockNumber: number): Promise<E.Either<Error, number>> {
    try {
      const bunkerModeSinceTimestamp = await retryAsync<number>(
        async (): Promise<number> => {
          const [resp] = await this.wdQueueContract.functions.bunkerModeSinceTimestamp({
            blockTag: blockNumber,
          })

          return resp.toNumber()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(bunkerModeSinceTimestamp)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wdQueueContract.bunkerModeSinceTimestamp`))
    }
  }

  public async getWithdrawalLastRequestId(blockNumber: number): Promise<E.Either<Error, number>> {
    try {
      const lastRequestId = await retryAsync<number>(
        async (): Promise<number> => {
          const [resp] = await this.wdQueueContract.functions.getLastRequestId({
            blockTag: blockNumber,
          })

          return resp.toNumber()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(lastRequestId)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wdQueueContract.getLastRequestId`))
    }
  }

  public async getWithdrawalStatus(
    requestId: number,
    blockNumber: number,
  ): Promise<E.Either<Error, WithdrawalRequest>> {
    try {
      const out = await retryAsync<WithdrawalRequest>(
        async (): Promise<WithdrawalRequest> => {
          const resp = await this.wdQueueContract.functions.getWithdrawalStatus([requestId], {
            blockTag: blockNumber,
          })

          return WithdrawalRequest.toWithdrawalRequest(resp.statuses[0], requestId)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wdQueueContract.getWithdrawalStatus`))
    }
  }

  public async getUnbufferedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>> {
    try {
      const out = await retryAsync<TypedEvent[]>(
        async (): Promise<TypedEvent[]> => {
          const filter = this.lidoContract.filters.Unbuffered()

          return await this.lidoContract.queryFilter(filter, fromBlockNumber, toBlockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call lidoContract.queryFilter`))
    }
  }

  public async getWithdrawalsFinalizedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>> {
    try {
      const out = await retryAsync<TypedEvent[]>(
        async (): Promise<TypedEvent[]> => {
          const filter = this.wdQueueContract.filters.WithdrawalsFinalized()

          return await this.wdQueueContract.queryFilter(filter, fromBlockNumber, toBlockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(out)
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call wdQueueContract.queryFilter`))
    }
  }

  public async getDepositableEther(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoContract.getDepositableEther({
            blockTag: blockNumber,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      return E.left(new NetworkError(e, `Could not call lidoContract.getDepositableEther"`))
    }
  }
}
