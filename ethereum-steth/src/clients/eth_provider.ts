import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import { Block } from '@ethersproject/providers'
import BigNumber from 'bignumber.js'
import { ethers } from 'ethers'
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils'
import { either as E } from 'fp-ts'
import { retryAsync } from 'ts-retry'
import { Logger } from 'winston'
import { BlockDto } from '../entity/events'
import { GateSeal, GateSealExpiredErr } from '../entity/gate_seal'
import { StakingLimitInfo } from '../entity/staking_limit_info'
import { StorageArrayResponse, StorageItemResponse } from '../entity/storage_slot'
import { WithdrawalRequest } from '../entity/withdrawal_request'
import {
  AstETH as AstEthRunner,
  ChainlinkAggregator,
  CurvePool,
  GateSeal as GateSealRunner,
  Lido as LidoRunner,
  StableDebtStETH as StableDebtStEthRunner,
  VariableDebtStETH as VariableDebtStEthRunner,
  ValidatorsExitBusOracle as VeboRunner,
  WithdrawalQueueERC721 as WithdrawalQueueRunner,
} from '../generated/typechain'
import { TypedEvent } from '../generated/typechain/common'
import { ETHDistributedEvent, UnbufferedEvent } from '../generated/typechain/Lido'
import { WithdrawalClaimedEvent } from '../generated/typechain/WithdrawalQueueERC721'
import { IAaveClient } from '../services/aave/Aave.srv'
import { IGateSealClient } from '../services/gate-seal/GateSeal.srv'
import { IPoolBalanceClient } from '../services/pools-balances/pool-balance.srv'
import { IStethClient } from '../services/steth_operation/StethOperation.srv'
import { IStorageWatcherClient } from '../services/storage-watcher/StorageWatcher.srv'
import { IVaultClient } from '../services/vault/Vault.srv'
import { IWithdrawalsClient } from '../services/withdrawals/Withdrawals.srv'
import { ETH_DECIMALS } from '../utils/constants'
import { NetworkError } from '../utils/errors'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { DataRW } from '../utils/mutex'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class ETHProvider
  implements
    IGateSealClient,
    IStethClient,
    IVaultClient,
    IWithdrawalsClient,
    IStorageWatcherClient,
    IAaveClient,
    IPoolBalanceClient
{
  private jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly lidoRunner: LidoRunner
  private readonly wdQueueRunner: WithdrawalQueueRunner
  private readonly veboRunner: VeboRunner
  private gateSealRunner: GateSealRunner

  private readonly astEthRunner: AstEthRunner
  private readonly stableDebtStEthRunner: StableDebtStEthRunner
  private readonly variableDebtStEthRunner: VariableDebtStEthRunner

  private readonly curvePoolRunner: CurvePool
  private readonly chainlinkAggregatorRunner: ChainlinkAggregator

  private readonly logger: Logger
  private readonly metrics: Metrics

  constructor(
    logger: Logger,
    metrcs: Metrics,
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    lidoRunner: LidoRunner,
    wdQueueRunner: WithdrawalQueueRunner,
    gateSealRunner: GateSealRunner,
    astEthRunner: AstEthRunner,
    stableDebtStEthRunner: StableDebtStEthRunner,
    variableDebtStEthRunner: VariableDebtStEthRunner,
    curvePoolRunner: CurvePool,
    chainlinkAggregatorRunner: ChainlinkAggregator,
    veboRunner: VeboRunner,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.lidoRunner = lidoRunner
    this.wdQueueRunner = wdQueueRunner
    this.gateSealRunner = gateSealRunner
    this.veboRunner = veboRunner
    this.astEthRunner = astEthRunner
    this.stableDebtStEthRunner = stableDebtStEthRunner
    this.variableDebtStEthRunner = variableDebtStEthRunner
    this.curvePoolRunner = curvePoolRunner
    this.chainlinkAggregatorRunner = chainlinkAggregatorRunner
    this.logger = logger
    this.metrics = metrcs
  }

  public async getBlockNumber(): Promise<E.Either<Error, number>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getBlockNumber.name }).startTimer()
    try {
      const latestBlockNumber = await this.jsonRpcProvider.getBlockNumber()

      this.metrics.etherJsRequest.labels({ method: this.getBlockNumber.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(latestBlockNumber)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlockNumber.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest block number`))
    }
  }

  public async getUnbufferedEvents(startBlock: number, endBlock: number): Promise<E.Either<Error, UnbufferedEvent[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getUnbufferedEvents.name }).startTimer()

    const fetchUnbufferedEvents = async (startBlock: number, endBlock: number): Promise<UnbufferedEvent[]> => {
      try {
        const out = await retryAsync<UnbufferedEvent[]>(
          async (): Promise<UnbufferedEvent[]> => {
            return await this.lidoRunner.queryFilter(this.lidoRunner.filters.Unbuffered(), startBlock, endBlock)
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )

        this.metrics.etherJsRequest.labels({ method: this.getUnbufferedEvents.name, status: StatusOK }).inc()
        end({ status: StatusOK })

        return out
      } catch (e) {
        this.metrics.etherJsRequest.labels({ method: this.getUnbufferedEvents.name, status: StatusFail }).inc()
        end({ status: StatusFail })

        throw new NetworkError(e, `Could not call UnbufferedEvents`)
      }
    }

    const unbufferedBatchSize = 500
    const promises = []
    for (let i = startBlock; i <= endBlock; i += unbufferedBatchSize) {
      const start = i
      const end = Math.min(i + unbufferedBatchSize - 1, endBlock)

      promises.push(fetchUnbufferedEvents(start, end))
    }

    try {
      const events = (await Promise.all(promises)).flat()
      events.sort((a, b) => a.blockNumber - b.blockNumber)

      return E.right(events)
    } catch (e) {
      if (e instanceof NetworkError) {
        return E.left(e)
      }

      return E.left(new Error(`Could not fetch unbuffered events`))
    }
  }

  public async getStethBalance(
    lidoStethAddress: string,
    blockTag: number | string,
  ): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getStethBalance.name }).startTimer()

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoRunner.balanceOf(lidoStethAddress, {
            blockTag: blockTag,
          })
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )
      this.metrics.etherJsRequest.labels({ method: this.getStethBalance.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getStethBalance.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch Steth balance`))
    }
  }

  public async getEthBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({
      method: this.getEthBalance.name,
    })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.jsonRpcProvider.getBalance(address, block)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getEthBalance.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getEthBalance.name, status: StatusFail }).inc()
      end({ status: StatusOK })

      return E.left(new NetworkError(e, `Could not fetch balance by address ${address}`))
    }
  }

  public async getBalanceByBlockHash(address: string, blockHash: string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getBalanceByBlockHash.name })

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const block = await this.jsonRpcProvider.getBlock(blockHash)
          const balance = await this.jsonRpcProvider.getBalance(address, new BigNumber(block.number, 10).toNumber())

          return balance.toString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getBalanceByBlockHash.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBalanceByBlockHash.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch balance by address ${address} and blockHash ${blockHash}`))
    }
  }

  public async getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getStakingLimitInfo.name }).startTimer()

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

      this.metrics.etherJsRequest.labels({ method: this.getStakingLimitInfo.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getStakingLimitInfo.name, status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'unfinalizedStETH', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'unfinalizedStETH', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.unfinalizedStETH`))
    }
  }

  public async getWithdrawalStatuses(
    requestIds: number[],
    currentBlock: number,
  ): Promise<E.Either<Error, WithdrawalRequest[]>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getWithdrawalStatuses.name })

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

        this.metrics.etherJsRequest.labels({ method: this.getWithdrawalStatuses.name, status: StatusOK }).inc()
        return out
      } catch (e) {
        this.metrics.etherJsRequest.labels({ method: this.getWithdrawalStatuses.name, status: StatusFail }).inc()
        throw new NetworkError(
          e,
          `Could not call wdQueueContract.getWithdrawalStatus on ${blockNumber} between ${requestIds[0]} and ${
            requestIds[requestIds.length - 1]
          }. Total: ${requestIds.length}`,
        )
      }
    }

    const chunkPromises: Promise<void>[] = []
    const MAX_REQUESTS_CHUNK_SIZE = 500
    const out = new DataRW<WithdrawalRequest>([])

    for (let i = 0; i < requestIds.length; i += MAX_REQUESTS_CHUNK_SIZE) {
      const requestChunk = requestIds.slice(i, i + MAX_REQUESTS_CHUNK_SIZE)

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

      this.metrics.etherJsRequest.labels({ method: 'getBufferedEther', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(resp.toString()))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'getBufferedEther', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'gate_seal_get_expiry_timestamp', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(expiryTimestamp)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'gate_seal_get_expiry_timestamp', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call gateSeal.functions.get_expiry_timestamp`))
    }
  }

  public async getETHDistributedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, ETHDistributedEvent[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getETHDistributedEvents.name }).startTimer()

    try {
      const report = await retryAsync<ETHDistributedEvent[]>(
        async (): Promise<ETHDistributedEvent[]> => {
          return await this.lidoRunner.queryFilter(
            this.lidoRunner.filters.ETHDistributed(),
            fromBlockNumber,
            toBlockNumber,
          )
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getETHDistributedEvents.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(report)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getETHDistributedEvents.name, status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'gate_seal_is_expired', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(isExpired)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'gate_seal_is_expired', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'wd_queue_hasRole', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(queuePauseRoleMember)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'wd_queue_hasRole', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'vebo_hasRole', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(exitBusPauseRoleMember)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'vebo_hasRole', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'getTotalPooledEther', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'getTotalPooledEther', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'getTotalShares', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'getTotalShares', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'wq_queue_is_bunker_mode_active', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(isBunkerMode)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'wq_queue_is_bunker_mode_active', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'wq_queue_bunker_mode_since_timestamp', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(bunkerModeSinceTimestamp)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'wq_queue_bunker_mode_since_timestamp', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'wq_queue_get_last_request_id', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(lastRequestId)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'wq_queue_get_last_request_id', status: StatusFail }).inc()
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

      this.metrics.etherJsRequest.labels({ method: 'wq_queue_get_withdrawal_status', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'wq_queue_get_withdrawal_status', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call wdQueueContract.getWithdrawalStatus`))
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

      this.metrics.etherJsRequest
        .labels({ method: 'wd_queue_get_withdrawals_finalized_events', status: StatusOK })
        .inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherJsRequest
        .labels({ method: 'wd_queue_get_withdrawals_finalized_events', status: StatusFail })
        .inc()
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

      this.metrics.etherJsRequest.labels({ method: 'lido_get_depositable_ether', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'lido_get_depositable_ether', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call lidoContract.getDepositableEther"`))
    }
  }

  public async getBlockByHash(blockHash: string): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getBlockByHash.name })

    try {
      const out = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock(blockHash)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getBlockByHash.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        number: out.number,
        timestamp: out.timestamp,
        parentHash: out.parentHash,
        hash: out.hash,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlockByHash.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getBlock(blockHash)`))
    }
  }

  public async getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getBlockByNumber.name })

    try {
      const out = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock(blockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getBlockByNumber.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        number: out.number,
        timestamp: out.timestamp,
        parentHash: out.parentHash,
        hash: out.hash,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlockByNumber.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.${this.getBlockByNumber.name}`))
    }
  }

  public async getChainPrevBlocks(parentHash: string, depth: number): Promise<E.Either<Error, BlockDto[]>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getChainPrevBlocks' })
    const chain = new Array<BlockDto>(depth)

    while (depth > 0) {
      try {
        const prevBlock = await retryAsync<BlockDto>(
          async (): Promise<BlockDto> => {
            const parentBlock = await this.getBlockByHash(parentHash)

            if (E.isLeft(parentBlock)) {
              throw parentBlock.left
            }

            return parentBlock.right
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )

        chain[depth - 1] = prevBlock
        parentHash = prevBlock.parentHash
        depth -= 1
      } catch (e) {
        this.metrics.etherJsRequest.labels({ method: 'getChainPrevBlocks', status: StatusFail }).inc()
        end({ status: StatusFail })

        return E.left(new NetworkError(e, `Could not call this.getBlockByHash(parentHash)`))
      }
    }

    this.metrics.etherJsRequest.labels({ method: 'getChainPrevBlocks', status: StatusOK }).inc()
    end({ status: StatusOK })

    return E.right(chain)
  }

  /**
   * Uses only for dev purposes for prefilling up db
   * Returns all claimed events from Lido V2.
   *
   * @param currentBlock
   */
  public async getClaimedEvents(currentBlock: number): Promise<E.Either<Error, WithdrawalClaimedEvent[]>> {
    const startedBlock = 17_264_250
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getClaimedEvents.name })

    const fetchClaimedEvents = async (from: number, to: number): Promise<WithdrawalClaimedEvent[]> => {
      try {
        return await retryAsync<WithdrawalClaimedEvent[]>(
          async (): Promise<WithdrawalClaimedEvent[]> => {
            const claimedFilter = this.wdQueueRunner.filters.WithdrawalClaimed()
            return await this.wdQueueRunner.queryFilter(claimedFilter, from, to)
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )
      } catch (e) {
        throw new NetworkError(e, `Could not call this.getClaimedEvents`)
      }
    }

    const batchPromises: Promise<void>[] = []
    const out = new DataRW<WithdrawalClaimedEvent>([])
    const batchSize = 10_000

    for (let i = startedBlock; i <= currentBlock; i += batchSize) {
      const start = i
      const end = Math.min(i + batchSize - 1, currentBlock)

      const promise = fetchClaimedEvents(start, end).then((chunkTrxResp) => {
        out.write(chunkTrxResp)
      })

      batchPromises.push(promise)
    }

    try {
      await Promise.all(batchPromises)

      this.metrics.etherJsRequest.labels({ method: this.getClaimedEvents.name, status: StatusOK }).inc()
      end({ status: StatusOK })
      return E.right(await out.read())
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getClaimedEvents.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch claimed events`))
    }
  }

  public async getStorageBySlotName(
    address: string,
    slotId: number,
    slotName: string,
    blockTag: string,
  ): Promise<E.Either<Error, StorageItemResponse>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getStorageBySlotName.name })

    type RpcRequest = {
      jsonrpc: string
      method: string
      params: Array<any>
    }

    type RpcResponse = {
      jsonrpc: string
      method: string
      result?: any
      error?: {
        code: number
        message: string
      }
    }

    const slot = keccak256(toUtf8Bytes(slotName))

    const request: RpcRequest = {
      jsonrpc: '2.0',
      method: `eth_getStorageAt`,
      params: [address, slot, blockTag],
    }

    try {
      const data = await retryAsync<string>(
        async (): Promise<string> => {
          const response: Response = await fetch(this.jsonRpcProvider.connection.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          })

          if (!response.ok) {
            throw new NetworkError(`Status: ${response.status}, request: ${JSON.stringify(request)}`, 'StorageFetchErr')
          }

          const object = (await response.json()) as RpcResponse
          if (object.result !== null) {
            return object.result
          } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            throw new Error(obj.error.message)
          }
        },
        { delay: 750, maxTry: 10 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getStorageBySlotName.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        slotId: slotId,
        value: data,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getStorageBySlotName.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call eth_getStorageAt`))
    }
  }

  public async getStorageAtSlotAddr(
    address: string,
    slotId: number,
    slotAddr: string,
    blockTag: string,
  ): Promise<E.Either<Error, StorageItemResponse>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getStorageAtSlotAddr.name })

    type RpcRequest = {
      jsonrpc: string
      method: string
      params: Array<any>
    }

    type RpcResponse = {
      jsonrpc: string
      method: string
      result?: any
      error?: {
        code: number
        message: string
      }
    }

    const request: RpcRequest = {
      jsonrpc: '2.0',
      method: `eth_getStorageAt`,
      params: [address, slotAddr, blockTag],
    }

    try {
      const data = await retryAsync<string>(
        async (): Promise<string> => {
          const response: Response = await fetch(this.jsonRpcProvider.connection.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          })

          if (!response.ok) {
            throw new NetworkError(`Status: ${response.status}, request: ${JSON.stringify(request)}`, 'StorageFetchErr')
          }

          const object = (await response.json()) as RpcResponse
          if (object.result !== null) {
            return object.result
          } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            throw new Error(obj.error.message)
          }
        },
        { delay: 750, maxTry: 10 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getStorageAtSlotAddr.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        slotId: slotId,
        value: data,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getStorageAtSlotAddr.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call eth_getStorageAt`))
    }
  }

  public async getStorageArrayAtSlotAddr(
    address: string,
    slotId: number,
    slotAddr: string,
    blockTag: string,
    len: number,
  ): Promise<E.Either<Error, StorageArrayResponse>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getStorageArrayAtSlotAddr.name })

    const arrayStart = '0x' + new BigNumber(slotAddr, 16).toString(16).padStart(64, '0')
    const requests: Promise<E.Either<Error, StorageItemResponse>>[] = []
    for (let i = 0; i < len; i++) {
      const objAddress = '0x' + new BigNumber(keccak256(arrayStart)).plus(i).toString(16)
      requests.push(this.getStorageAtSlotAddr(address, slotId, objAddress, blockTag))
    }

    try {
      const responses = await Promise.all(requests)

      const values: string[] = []
      for (const item of responses) {
        if (E.isRight(item)) {
          values.push(item.right.value)
        }
      }

      this.metrics.etherJsRequest.labels({ method: this.getStorageArrayAtSlotAddr.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        slotId: slotId,
        values: values,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getStorageArrayAtSlotAddr.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call eth_getStorageAt`))
    }
  }

  public async getTotalSupply(blockHash: string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getTotalSupply.name })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const block = await this.jsonRpcProvider.getBlock(blockHash)
          const [totalSupply] = await this.astEthRunner.functions.totalSupply({
            blockTag: block.number,
          })

          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch aave totalSupply`))
    }
  }

  public async getStableDebtStEthTotalSupply(blockTag: number | string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getStableDebtStEthTotalSupply.name })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [totalSupply] = await this.stableDebtStEthRunner.functions.totalSupply({
            blockTag: blockTag,
          })

          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getStableDebtStEthTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getStableDebtStEthTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch stableDebtStETHContract.totalSupply`))
    }
  }

  public async getVariableDebtStEthTotalSupply(blockTag: number | string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getVariableDebtStEthTotalSupply.name })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [totalSupply] = await this.variableDebtStEthRunner.functions.totalSupply({
            blockTag: blockTag,
          })

          return totalSupply
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getVariableDebtStEthTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherJsRequest
        .labels({ method: this.getVariableDebtStEthTotalSupply.name, status: StatusFail })
        .inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch variableDebtStETHContract.totalSupply`))
    }
  }

  public async getCurveEthBalance(blockTag: number | string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getCurveEthBalance.name })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [ethBalance] = await this.curvePoolRunner.functions.balances(0, {
            blockTag: blockTag,
          })

          return ethBalance
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getCurveEthBalance.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getCurveEthBalance.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch curvePool eth balance`))
    }
  }

  public async getCurveStEthBalance(blockTag: number | string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getCurveStEthBalance.name })

    try {
      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [stethBalance] = await this.curvePoolRunner.functions.balances(1, {
            blockTag: blockTag,
          })

          return stethBalance
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getCurveStEthBalance.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(String(out)))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getCurveStEthBalance.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch curvePool steth balance`))
    }
  }

  public async getCurveStEthToEthPrice(blockTag: number | string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getCurveStEthToEthPrice.name })

    try {
      const amountStEth = new BigNumber(1000).times(ETH_DECIMALS)

      const out = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          const [amountEth] = await this.curvePoolRunner.functions.get_dy(1, 0, amountStEth.toFixed(), {
            blockTag: blockTag,
          })

          return amountEth
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getCurveStEthToEthPrice.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out.toString()).div(amountStEth))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getCurveStEthToEthPrice.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch curvePoolContract.get_dy`))
    }
  }

  public async getChainlinkStEthToEthPrice(blockTag: number | string): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getChainlinkStEthToEthPrice.name })

    try {
      const hexValue = await retryAsync<string>(
        async (): Promise<string> => {
          const [peg] = await this.chainlinkAggregatorRunner.functions.latestAnswer({
            blockTag: blockTag,
          })

          return peg.toHexString()
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getChainlinkStEthToEthPrice.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(hexValue).dividedBy(ETH_DECIMALS))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getChainlinkStEthToEthPrice.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch chainlinkAggregatorContract.latestAnswer`))
    }
  }
}
