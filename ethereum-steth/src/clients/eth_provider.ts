import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import { either as E } from 'fp-ts'
import { retryAsync } from 'ts-retry'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import BigNumber from 'bignumber.js'
import { ETH_DECIMALS } from '../utils/constants'
import { StakingLimitInfo } from '../entity/staking_limit_info'
import {
  GateSeal as GateSealRunner,
  Lido as LidoRunner,
  ValidatorsExitBusOracle as VeboRunner,
  WithdrawalQueueERC721 as WithdrawalQueueRunner,
} from '../generated/typechain'
import { GateSeal, GateSealExpiredErr } from '../entity/gate_seal'
import { ETHDistributedEvent } from '../generated/typechain/Lido'
import { DataRW } from '../utils/mutex'
import { WithdrawalRequest } from '../entity/withdrawal_request'
import { TypedEvent } from '../generated/typechain/common'
import { NetworkError } from '../utils/errors'
import { Logger } from 'winston'
import { IGateSealClient } from '../services/gate-seal/GateSeal.srv'
import { BlockTag } from '@ethersproject/providers'
import { IStethClient } from '../services/steth_operation/StethOperation.srv'
import { IVaultClient } from '../services/vault/Vault.srv'
import { IWithdrawalsClient } from '../services/withdrawals/Withdrawals.srv'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export abstract class IEtherscanProvider {
  abstract getHistory(
    addressOrName: string | Promise<string>,
    startBlock?: BlockTag,
    endBlock?: BlockTag,
  ): Promise<Array<TransactionResponse>>

  abstract getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<EtherBigNumber>
}

export class ETHProvider implements IGateSealClient, IStethClient, IVaultClient, IWithdrawalsClient {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider
  private etherscanProvider: IEtherscanProvider

  private readonly lidoRunner: LidoRunner
  private readonly wdQueueRunner: WithdrawalQueueRunner
  private readonly veboRunner: VeboRunner
  private gateSealRunner: GateSealRunner
  private readonly logger: Logger
  private readonly metrics: Metrics

  constructor(
    logger: Logger,
    metrcs: Metrics,
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    etherscanProvider: IEtherscanProvider,
    lidoRunner: LidoRunner,
    wdQueueRunner: WithdrawalQueueRunner,
    gateSealRunner: GateSealRunner,
    veboRunner: VeboRunner,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.etherscanProvider = etherscanProvider
    this.lidoRunner = lidoRunner
    this.wdQueueRunner = wdQueueRunner
    this.gateSealRunner = gateSealRunner
    this.veboRunner = veboRunner
    this.logger = logger
    this.metrics = metrcs
  }

  public async getBlockNumber(): Promise<E.Either<Error, number>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getBlockNumber' }).startTimer()
    try {
      const latestBlockNumber = await this.jsonRpcProvider.getBlockNumber()

      this.metrics.etherCalls.labels({ method: 'getBlockNumber', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(latestBlockNumber)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'getBlockNumber', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest block number`))
    }
  }

  public async getHistory(
    depositSecurityAddress: string,
    startBlock: number,
    endBlock: number,
  ): Promise<E.Either<Error, TransactionResponse[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getHistory' }).startTimer()
    const fetchBatch = async (start: number, end: number): Promise<TransactionResponse[]> => {
      try {
        const out = await retryAsync<TransactionResponse[]>(
          async (): Promise<TransactionResponse[]> => {
            return await this.etherscanProvider.getHistory(depositSecurityAddress, start, end)
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )

        this.metrics.etherCalls.labels({ method: 'getHistory', status: StatusOK }).inc()
        return out
      } catch (err) {
        this.metrics.etherCalls.labels({ method: 'getHistory', status: StatusFail }).inc()
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

      end({ status: StatusOK })
      return E.right(await out.read())
    } catch (e) {
      end({ status: StatusFail })
      return E.left(new NetworkError(e, `Could not fetch transaction history`))
    }
  }

  public async getStethBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getStethBalance' }).startTimer()

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.etherscanProvider.getBalance(lidoStethAddress, block)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      this.metrics.etherCalls.labels({ method: 'etherscanProvider.getBalance', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'etherscanProvider.getBalance', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch Steth balance`))
    }
  }

  public async getBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({
      method: 'getBalance',
    })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.jsonRpcProvider.getBalance(address, block)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'getBalance', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'getBalance', status: StatusFail }).inc()
      end({ status: StatusOK })

      return E.left(new NetworkError(e, `Could not fetch balance by address ${address}`))
    }
  }

  public async getBalanceByBlockHash(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getBalanceByBlockHash' })

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const block = await this.jsonRpcProvider.getBlock(blockHash)
          const balance = await this.jsonRpcProvider.getBalance(address, new BigNumber(block.number, 10).toNumber())

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'getBalanceByBlockHash', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'getBalanceByBlockHash', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch balance by address ${address} and blockHash ${blockHash}`))
    }
  }

  public async getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getStakingLimitInfo' }).startTimer()

    try {
      const out = await retryAsync<StakingLimitInfo>(
        async (): Promise<StakingLimitInfo> => {
          const resp = await this.lidoRunner.functions.getStakeLimitFullInfo({
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

      this.metrics.etherCalls.labels({ method: 'getStakeLimitFullInfo', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'getStakeLimitFullInfo', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call lidoContract.getStakeLimitFullInfo`))
    }
  }

  public async getUnfinalizedStETH(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getUnfinalizedStETH' }).startTimer()

    try {
      const out = await retryAsync<BigNumber>(
        async (): Promise<BigNumber> => {
          const out = await this.wdQueueRunner.unfinalizedStETH({
            blockTag: blockNumber,
          })

          return new BigNumber(String(out))
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'unfinalizedStETH', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'unfinalizedStETH', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.unfinalizedStETH`))
    }
  }

  public async getWithdrawalStatuses(
    requestsRange: number[],
    currentBlock: number,
  ): Promise<E.Either<Error, WithdrawalRequest[]>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getWithdrawalStatus' })

    const fetchStatusesChunk = async (requestIds: number[], blockNumber: number): Promise<WithdrawalRequest[]> => {
      try {
        const out = await retryAsync<WithdrawalRequest[]>(
          async (): Promise<WithdrawalRequest[]> => {
            const resp = await this.wdQueueRunner.functions.getWithdrawalStatus(requestIds, {
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

        this.metrics.etherCalls.labels({ method: 'getWithdrawalStatus', status: StatusOK }).inc()
        return out
      } catch (e) {
        this.metrics.etherCalls.labels({ method: 'getWithdrawalStatus', status: StatusFail }).inc()
        throw new NetworkError(
          e,
          `Could not call wdQueueContract.getWithdrawalStatus on ${blockNumber} between ${requestIds[0]} and ${
            requestIds[requestIds.length - 1]
          }. Total: ${requestIds.length}`,
        )
      }
    }

    const chunkPromises: Promise<void>[] = []
    const MAX_REQUESTS_CHUNK_SIZE = 875
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
      end({ status: StatusOK })

      return E.right(await out.read())
    } catch (e) {
      end({ status: StatusFail })

      return E.left(new NetworkError(e))
    }
  }

  public async getBufferedEther(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getBufferedEther' })

    try {
      const resp = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoRunner.getBufferedEther({
            blockTag: blockNumber,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'getBufferedEther', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(resp.toString()))
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'getBufferedEther', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call lidoContract.getBufferedEther`))
    }
  }

  public async checkGateSeal(blockNumber: number, gateSealAddress: string): Promise<E.Either<Error, GateSeal>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'checkGateSeal' })

    const isExpired = await this.isGateSealExpired(blockNumber, gateSealAddress)
    if (E.isLeft(isExpired)) {
      end({ status: StatusFail })
      return E.left(isExpired.left)
    }

    if (isExpired.right) {
      end({ status: StatusFail })
      return E.left(GateSealExpiredErr)
    }

    const [isGateSealHasPauseRole, isGateSealHasExitBusPauseRoleMember] = await Promise.all([
      this.isGateSealHasPauseRole(blockNumber, gateSealAddress),
      this.isGateSealHasExitBusPauseRoleMember(blockNumber, gateSealAddress),
    ])

    if (E.isLeft(isGateSealHasPauseRole)) {
      end({ status: StatusFail })
      return E.left(isGateSealHasPauseRole.left)
    }

    if (E.isLeft(isGateSealHasExitBusPauseRoleMember)) {
      end({ status: StatusFail })
      return E.left(isGateSealHasExitBusPauseRoleMember.left)
    }

    const out: GateSeal = {
      roleForWithdrawalQueue: isGateSealHasPauseRole.right,
      roleForExitBus: isGateSealHasExitBusPauseRoleMember.right,
      exitBusOracleAddress: this.veboRunner.address,
      withdrawalQueueAddress: this.wdQueueRunner.address,
    }

    end({ status: StatusOK })
    return E.right(out)
  }

  public async getExpiryTimestamp(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'gateSealGetExpiryTimestamp' })

    try {
      const expiryTimestamp = await retryAsync<BigNumber>(
        async (): Promise<BigNumber> => {
          const [resp] = await this.gateSealRunner.functions.get_expiry_timestamp({
            blockTag: blockNumber,
          })

          return new BigNumber(String(resp))
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'gate_seal_get_expiry_timestamp', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(expiryTimestamp)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'gate_seal_get_expiry_timestamp', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call gateSeal.functions.get_expiry_timestamp`))
    }
  }

  public async getETHDistributedEvent(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, ETHDistributedEvent | null>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getETHDistributedEvent' }).startTimer()

    try {
      const report = await retryAsync<ETHDistributedEvent | null>(
        async (): Promise<ETHDistributedEvent | null> => {
          const [resp] = await this.lidoRunner.queryFilter(
            this.lidoRunner.filters.ETHDistributed(),
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

      this.metrics.etherCalls.labels({ method: 'lido_get_eth_distributed_events', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(report)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'lido_get_eth_distributed_events', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call this.lidoContract.filters.ETHDistributed"`))
    }
  }

  private async isGateSealExpired(blockNumber: number, gateSealAddress: string): Promise<E.Either<Error, boolean>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'isGateSealExpired' })

    this.gateSealRunner = this.gateSealRunner.attach(gateSealAddress)

    try {
      const isExpired = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [resp] = await this.gateSealRunner.functions.is_expired({
            blockTag: blockNumber,
          })

          return resp
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'gate_seal_is_expired', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(isExpired)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'gate_seal_is_expired', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call gateSeal.functions.is_expired`))
    }
  }

  private async isGateSealHasPauseRole(
    blockNumber: number,
    gateSealAddress: string,
  ): Promise<E.Either<Error, boolean>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'isGateSealHasPauseRole' }).startTimer()
    const keccakPauseRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSE_ROLE'))

    try {
      const queuePauseRoleMember = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [resp] = await this.wdQueueRunner.functions.hasRole(keccakPauseRole, gateSealAddress, {
            blockTag: blockNumber,
          })

          return resp
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'wd_queue_hasRole', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(queuePauseRoleMember)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'wd_queue_hasRole', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.functions.hasRole`))
    }
  }

  private async isGateSealHasExitBusPauseRoleMember(
    blockNumber: number,
    gateSealAddress: string,
  ): Promise<E.Either<Error, boolean>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'isGateSealHasExitBusPauseRoleMember' })

    const keccakPauseRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PAUSE_ROLE'))

    try {
      const exitBusPauseRoleMember = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [resp] = await this.veboRunner.functions.hasRole(keccakPauseRole, gateSealAddress, {
            blockTag: blockNumber,
          })

          return resp
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'vebo_hasRole', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(exitBusPauseRoleMember)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'vebo_hasRole', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call this.exitBusContract.functions.hasRole`))
    }
  }

  public async getTotalPooledEther(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getTotalPooledEther' })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoRunner.getTotalPooledEther({
            blockTag: blockNumber,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'getTotalPooledEther', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'getTotalPooledEther', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call this.getTotalPooledEther`))
    }
  }

  public async getTotalShares(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getTotalShares' })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoRunner.getTotalShares({
            blockTag: blockNumber,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'getTotalShares', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'getTotalShares', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call lidoContract.getTotalShares`))
    }
  }

  public async getShareRate(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getShareRate' })

    const [totalPooledEth, totalShares] = await Promise.all([
      this.getTotalPooledEther(blockNumber),
      this.getTotalShares(blockNumber),
    ])

    if (E.isLeft(totalPooledEth)) {
      end({ status: StatusFail })
      return E.left(totalPooledEth.left)
    }

    if (E.isLeft(totalShares)) {
      end({ status: StatusFail })
      return E.left(totalShares.left)
    }

    end({ status: StatusOK })
    return E.right(totalPooledEth.right.div(totalShares.right))
  }

  public async isBunkerModeActive(blockNumber: number): Promise<E.Either<Error, boolean>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'isBunkerModeActive' })

    try {
      const isBunkerMode = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [isBunkerMode] = await this.wdQueueRunner.functions.isBunkerModeActive({
            blockTag: blockNumber,
          })

          return isBunkerMode
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'wq_queue_is_bunker_mode_active', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(isBunkerMode)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'wq_queue_is_bunker_mode_active', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.isBunkerModeActive`))
    }
  }

  public async getBunkerTimestamp(blockNumber: number): Promise<E.Either<Error, number>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getBunkerTimestamp' })

    try {
      const bunkerModeSinceTimestamp = await retryAsync<number>(
        async (): Promise<number> => {
          const [resp] = await this.wdQueueRunner.functions.bunkerModeSinceTimestamp({
            blockTag: blockNumber,
          })

          return resp.toNumber()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'wq_queue_bunker_mode_since_timestamp', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(bunkerModeSinceTimestamp)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'wq_queue_bunker_mode_since_timestamp', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.bunkerModeSinceTimestamp`))
    }
  }

  public async getWithdrawalLastRequestId(blockNumber: number): Promise<E.Either<Error, number>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getWithdrawalLastRequestId' })

    try {
      const lastRequestId = await retryAsync<number>(
        async (): Promise<number> => {
          const [resp] = await this.wdQueueRunner.functions.getLastRequestId({
            blockTag: blockNumber,
          })

          return resp.toNumber()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'wq_queue_get_last_request_id', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(lastRequestId)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'wq_queue_get_last_request_id', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.getLastRequestId`))
    }
  }

  public async getWithdrawalStatus(
    requestId: number,
    blockNumber: number,
  ): Promise<E.Either<Error, WithdrawalRequest>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getWithdrawalStatus' })

    try {
      const out = await retryAsync<WithdrawalRequest>(
        async (): Promise<WithdrawalRequest> => {
          const resp = await this.wdQueueRunner.functions.getWithdrawalStatus([requestId], {
            blockTag: blockNumber,
          })

          return WithdrawalRequest.toWithdrawalRequest(resp.statuses[0], requestId)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'wq_queue_get_withdrawal_status', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'wq_queue_get_withdrawal_status', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.getWithdrawalStatus`))
    }
  }

  public async getUnbufferedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getUnbufferedEvents' })

    try {
      const out = await retryAsync<TypedEvent[]>(
        async (): Promise<TypedEvent[]> => {
          const filter = this.lidoRunner.filters.Unbuffered()

          return await this.lidoRunner.queryFilter(filter, fromBlockNumber, toBlockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'lido_get_unbuffered_events', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'lido_get_unbuffered_events', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call lidoContract.queryFilter`))
    }
  }

  public async getWithdrawalsFinalizedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getWithdrawalsFinalizedEvents' })

    try {
      const out = await retryAsync<TypedEvent[]>(
        async (): Promise<TypedEvent[]> => {
          const filter = this.wdQueueRunner.filters.WithdrawalsFinalized()

          return await this.wdQueueRunner.queryFilter(filter, fromBlockNumber, toBlockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'wd_queue_get_withdrawals_finalized_events', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'wd_queue_get_withdrawals_finalized_events', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.queryFilter`))
    }
  }

  public async getDepositableEther(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getDepositableEther' })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoRunner.getDepositableEther({
            blockTag: blockNumber,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherCalls.labels({ method: 'lido_get_depositable_ether', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      this.metrics.etherCalls.labels({ method: 'lido_get_depositable_ether', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call lidoContract.getDepositableEther"`))
    }
  }
}
