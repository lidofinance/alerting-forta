import BigNumber from 'bignumber.js'
import { StethOperationCache } from './StethOperation.cache'
import { ETH_DECIMALS } from '../../utils/constants'
import * as E from 'fp-ts/Either'
import { IETHProvider } from '../../clients/eth_provider'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { Lido as LidoContract, WithdrawalQueueERC721 as WithdrawalQueue } from '../../generated'
import { retryAsync } from 'ts-retry'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import { Event as EthersEvent } from 'ethers'

// Formula: (60 * 60 * 72) / 13 = 19_938
const HISTORY_BLOCK_OFFSET: number = Math.floor((60 * 60 * 72) / 13)
const BLOCK_CHECK_INTERVAL: number = 100
const MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL: number = 20_000 // 20000 ETH
const REPORT_WINDOW = 60 * 60 * 24 // 24 hours
const MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME = 60 * 60 // 1 hour
const MAX_DEPOSITABLE_ETH_AMOUNT_MEDIUM = 10_000 // 10000 ETH
const MAX_DEPOSITOR_TX_DELAY = 60 * 60 * 72 // 72 Hours

export class StethOperationSrv {
  private readonly name = 'StethOperation'
  private readonly cache: StethOperationCache
  private readonly ethProvider: IETHProvider
  private readonly depositSecurityAddress: string
  private readonly lidoStethAddress: string
  private readonly lidoContract: LidoContract
  private readonly wdQueueContract: WithdrawalQueue

  constructor(
    cache: StethOperationCache,
    ethProvider: IETHProvider,
    depositSecurityAddress: string,
    lidoStethAddress: string,
    lidoContract: LidoContract,
    wdQueueContract: WithdrawalQueue,
  ) {
    this.cache = cache
    this.ethProvider = ethProvider
    this.depositSecurityAddress = depositSecurityAddress
    this.lidoStethAddress = lidoStethAddress
    this.lidoContract = lidoContract
    this.wdQueueContract = wdQueueContract
  }

  public async initialize(currentBlock: number): Promise<Error | null> {
    console.log(`[${this.name}] started on block ${currentBlock}`)

    const history = await this.ethProvider.getHistory(
      this.depositSecurityAddress,
      currentBlock - HISTORY_BLOCK_OFFSET,
      currentBlock - 1,
    )
    if (E.isLeft(history)) {
      return history.left
    }

    const depositorTxTimestamps: number[] = []
    for (const record of history.right) {
      depositorTxTimestamps.push(record.timestamp ? record.timestamp : 0)
    }

    if (depositorTxTimestamps.length > 0) {
      depositorTxTimestamps.sort((a, b) => b - a)
      this.cache.setLastDepositorTxTime(depositorTxTimestamps[0])
    }

    const bufferedEthRaw = await this.ethProvider.getBalance(this.lidoStethAddress, currentBlock)
    if (E.isLeft(bufferedEthRaw)) {
      return bufferedEthRaw.left
    }

    this.cache.setLastBufferedEth(new BigNumber(String(bufferedEthRaw.right)))

    console.log(`[${this.name}] Last Depositor TxTime: ${this.cache.getLastDepositorTxTime()}`)
    console.log(
      `[${this.name}] Buffered Eth: ${this.cache
        .getLastBufferedEth()
        .div(ETH_DECIMALS)
        .toFixed(2)} on ${currentBlock} block`,
    )

    return null
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const findings: Finding[] = []

    await Promise.all([
      // handleBufferedEth(blockEvent, findings),
      // handleDepositExecutorBalance(blockEvent, findings),
      // handleStakingLimit(blockEvent, findings),
    ])

    return findings
  }

  public async handleBufferedEth(blockEvent: BlockEvent): Promise<E.Either<Error, Finding[]>> {
    const blockNumber = blockEvent.block.number
    const blockTimestamp = blockEvent.block.timestamp

    let bufferedEthRaw: BigNumber
    try {
      const resp = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoContract.getBufferedEther({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      bufferedEthRaw = new BigNumber(resp.toString())
    } catch (e) {
      return E.left(new Error(`Could not call "lidoContract.getBufferedEther". Cause: ${e}`))
    }

    const bufferedEth = bufferedEthRaw.div(ETH_DECIMALS).toNumber()
    let depositableEther: number

    try {
      const resp = await retryAsync<EtherBigNumber>(
        async (): Promise<EtherBigNumber> => {
          return await this.lidoContract.getDepositableEther({
            blockTag: blockNumber,
          })
        },
        { delay: 500, maxTry: 5 },
      )

      const depositableEtherRaw = new BigNumber(resp.toString())
      depositableEther = depositableEtherRaw.div(ETH_DECIMALS).toNumber()
    } catch (e) {
      return E.left(new Error(`Could not call "lidoContract.getDepositableEther". Cause: ${e}`))
    }

    // We use shifted block number to ensure that nodes return correct values
    const shiftedBlockNumber = blockNumber - 3
    const shifte3dBufferedEthRaw = await this.getBufferedEther(shiftedBlockNumber)
    if (E.isLeft(shifte3dBufferedEthRaw)) {
      return E.left(new Error(`Could not call "getBufferedEther". Cause: ${shifte3dBufferedEthRaw.left}`))
    }
    const shifte4dBufferedEthRaw = await this.getBufferedEther(shiftedBlockNumber - 1)
    if (E.isLeft(shifte4dBufferedEthRaw)) {
      return E.left(new Error(`Could not call "getBufferedEther". Cause: ${shifte4dBufferedEthRaw.left}`))
    }

    const out: Finding[] = []
    if (shifte3dBufferedEthRaw.right.lt(shifte4dBufferedEthRaw.right)) {
      let unbufferedEvents: EthersEvent[]

      try {
        unbufferedEvents = await retryAsync<EthersEvent[]>(
          async (): Promise<EthersEvent[]> => {
            return await this.lidoContract.queryFilter(
              this.lidoContract.filters.Unbuffered(),
              shiftedBlockNumber,
              shiftedBlockNumber,
            )
          },
          { delay: 500, maxTry: 5 },
        )
      } catch (e) {
        return E.left(new Error(`Could not fetch unbufferedEvents. Cause: ${e}`))
      }

      let wdReqFinalizedEvents: EthersEvent[]
      try {
        wdReqFinalizedEvents = await retryAsync<EthersEvent[]>(
          async (): Promise<EthersEvent[]> => {
            return await this.wdQueueContract.queryFilter(
              this.wdQueueContract.filters.WithdrawalsFinalized(),
              shiftedBlockNumber,
              shiftedBlockNumber,
            )
          },
          { delay: 500, maxTry: 5 },
        )
      } catch (e) {
        return E.left(new Error(`Could not fetch wdReqFinalizedEvents. Cause: ${e}`))
      }

      if (unbufferedEvents.length === 0 && wdReqFinalizedEvents.length === 0) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Buffered ETH drain',
            description:
              `Buffered ETH amount decreased from ` +
              `${shifte4dBufferedEthRaw.right.div(ETH_DECIMALS).toFixed(2)} ` +
              `to ${shifte3dBufferedEthRaw.right.div(ETH_DECIMALS).toFixed(2)} ` +
              `without Unbuffered or WithdrawalsFinalized events\n\nNote: actual handled block number is ${shiftedBlockNumber}`,
            alertId: 'BUFFERED-ETH-DRAIN',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
      }
    }

    if (blockNumber % BLOCK_CHECK_INTERVAL === 0) {
      // Keep track of buffer size above MAX_BUFFERED_ETH_AMOUNT_CRITICAL
      if (depositableEther > MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL) {
        if (this.cache.getCriticalDepositableAmountTime() === 0) {
          this.cache.setCriticalDepositableAmountTime(blockTimestamp)
        }
      } else {
        // reset counter if buffered amount goes below MAX_BUFFERED_ETH_AMOUNT_CRITICAL
        this.cache.setCriticalDepositableAmountTime(0)
      }

      if (this.cache.getLastReportedDepositableEth() + REPORT_WINDOW < blockTimestamp) {
        if (
          depositableEther > MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL &&
          this.cache.getCriticalDepositableAmountTime() < blockTimestamp - MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME
        ) {
          out.push(
            Finding.fromObject({
              name: '🚨 Huge depositable ETH amount',
              description:
                `There are ${depositableEther.toFixed(2)} ` +
                `depositable ETH in DAO for more than ` +
                `${Math.floor(MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME / (60 * 60))} hour(s)`,
              alertId: 'HUGE-DEPOSITABLE-ETH',
              severity: FindingSeverity.High,
              type: FindingType.Degraded,
            }),
          )
          this.cache.setLastReportedDepositableEth(blockTimestamp)
        } else if (
          depositableEther > MAX_DEPOSITABLE_ETH_AMOUNT_MEDIUM &&
          this.cache.getLastDepositorTxTime() < blockTimestamp - MAX_DEPOSITOR_TX_DELAY &&
          this.cache.getLastDepositorTxTime() !== 0
        ) {
          out.push(
            Finding.fromObject({
              name: '⚠️ High depositable ETH amount',
              description:
                `There are ${bufferedEth.toFixed(2)} ` +
                `depositable ETH in DAO and there are more than ` +
                `${Math.floor(MAX_DEPOSITOR_TX_DELAY / (60 * 60))} ` +
                `hours since last Depositor TX`,
              alertId: 'HIGH-DEPOSITABLE-ETH',
              severity: FindingSeverity.Medium,
              type: FindingType.Suspicious,
            }),
          )
          this.cache.setLastReportedDepositableEth(blockTimestamp)
        }
      }
    }

    return E.right(out)
  }

  private async getBufferedEther(blockNumber: number): Promise<E.Either<Error, BigNumber>> {
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
}
