import { Block } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { retryAsync } from 'ts-retry'
import { WithdrawalRecord } from '../entity/blockDto'
import BigNumber from 'bignumber.js'
import { ERC20Bridged, L2ERC20TokenBridge as L2BridgeRunner } from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { WithdrawalInitiatedEvent } from '../generated/typechain/L2ERC20TokenBridge'
import { IMonitorWithdrawalsClient } from '../services/monitor_withdrawals'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { IL2BridgeBalanceClient } from '../services/bridge_balance'

export class OptimismClient implements IMonitorWithdrawalsClient, IL2BridgeBalanceClient {
  private readonly jsonRpcProvider: ethers.providers.JsonRpcProvider
  private readonly l2BridgeRunner: L2BridgeRunner
  private readonly metrics: Metrics

  private readonly bridgedWstEthRunner: ERC20Bridged
  private readonly bridgedLdoRunner: ERC20Bridged

  constructor(
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    metrics: Metrics,
    l2BridgeRunner: L2BridgeRunner,
    bridgedWstEthRunner: ERC20Bridged,
    bridgedLdoRunner: ERC20Bridged,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.metrics = metrics
    this.l2BridgeRunner = l2BridgeRunner
    this.bridgedWstEthRunner = bridgedWstEthRunner
    this.bridgedLdoRunner = bridgedLdoRunner
  }

  public async getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, WithdrawalInitiatedEvent[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWithdrawalEvents.name }).startTimer()

    try {
      const out = await retryAsync<WithdrawalInitiatedEvent[]>(
        async (): Promise<WithdrawalInitiatedEvent[]> => {
          return await this.l2BridgeRunner.queryFilter(
            this.l2BridgeRunner.filters.WithdrawalInitiated(),
            fromBlockNumber,
            toBlockNumber,
          )
        },
        { delay: 500, maxTry: 5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getWithdrawalEvents.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(out)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getWithdrawalEvents.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch withdrawEvents`))
    }
  }

  public async getWithdrawalRecords(
    withdrawalEvents: WithdrawalInitiatedEvent[],
  ): Promise<E.Either<NetworkError, WithdrawalRecord[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWithdrawalRecords.name }).startTimer()

    const out: WithdrawalRecord[] = []

    for (const withdrawEvent of withdrawalEvents) {
      if (withdrawEvent.args) {
        let block: Block
        try {
          block = await retryAsync<Block>(
            async (): Promise<Block> => {
              return await withdrawEvent.getBlock()
            },
            { delay: 500, maxTry: 5 },
          )

          const record: WithdrawalRecord = {
            timestamp: block.timestamp,
            amount: new BigNumber(String(withdrawEvent.args._amount)),
          }

          out.push(record)
        } catch (e) {
          this.metrics.etherJsRequest.labels({ method: this.getWithdrawalRecords.name, status: StatusFail }).inc()
          end({ status: StatusFail })

          return E.left(new NetworkError(e, `Could not fetch block from withdrawEvent`))
        }
      }
    }

    this.metrics.etherJsRequest.labels({ method: this.getWithdrawalEvents.name, status: StatusOK }).inc()
    end({ status: StatusOK })

    return E.right(out)
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

  public async getWstEthTotalSupply(l2blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getWstEthTotalSupply.name }).startTimer()

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedWstEthRunner.functions.totalSupply({
            blockTag: l2blockNumber,
          })

          return balance.toString()
        },
        { delay: 500, maxTry: 5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getWstEthTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getWstEthTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call bridgedWstEthRunner.functions.totalSupply`))
    }
  }

  public async getLdoTotalSupply(l2blockNumber: number): Promise<E.Either<Error, BigNumber>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: this.getLdoTotalSupply.name }).startTimer()

    try {
      const out = await retryAsync<string>(
        async (): Promise<string> => {
          const [balance] = await this.bridgedLdoRunner.functions.totalSupply({
            blockTag: l2blockNumber,
          })

          return balance.toString()
        },
        { delay: 500, maxTry: 5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getLdoTotalSupply.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(new BigNumber(out))
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getLdoTotalSupply.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call bridgedLdoRunner.functions.totalSupply`))
    }
  }
}
