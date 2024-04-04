import { StethOperationCache } from './StethOperation.cache'
import { ETH_DECIMALS } from '../../utils/constants'
import * as E from 'fp-ts/Either'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { elapsedTime } from '../../utils/time'
import { IStethClient, TransactionEventContract } from './contracts'
import { Logger } from 'winston'
import { alertId_token_rebased } from '../../utils/events/lido_events'
import { networkAlert } from '../../utils/errors'
import { formatAddressAsForta } from '../../utils/forta'

// Formula: (60 * 60 * 72) / 13 = 19_938
const HISTORY_BLOCK_OFFSET: number = Math.floor((60 * 60 * 72) / 13)
const BLOCK_CHECK_INTERVAL: number = 100
const BLOCK_CHECK_INTERVAL_SMAll: number = 25
export const MAX_DEPOSITABLE_ETH_AMOUNT_MEDIUM = 10_000 // 10000 ETH
export const MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL: number = 20_000 // 20000 ETH
const REPORT_WINDOW = 60 * 60 * 24 // 24 hours
export const MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME = 60 * 60 // 1 hour

export const MAX_DEPOSITOR_TX_DELAY = 60 * 60 * 72 // 72 Hours
const REPORT_WINDOW_EXECUTOR_BALANCE = 60 * 60 * 4 // 4 Hours
export const MIN_DEPOSIT_EXECUTOR_BALANCE = 2 // 2 ETH
const REPORT_WINDOW_STAKING_LIMIT_10 = 60 * 60 * 12 // 12 hours
const REPORT_WINDOW_STAKING_LIMIT_30 = 60 * 60 * 12 // 12 hours

export class StethOperationSrv {
  private readonly name = 'StethOperationSrv'
  private readonly logger: Logger
  private readonly cache: StethOperationCache
  private readonly ethProvider: IStethClient
  private readonly depositSecurityAddress: string
  private readonly lidoStethAddress: string
  private readonly lidoDepositExecutorAddress: string

  private readonly depositSecurityEvents: EventOfNotice[]
  private readonly lidoEvents: EventOfNotice[]
  private readonly insuranceFundEvents: EventOfNotice[]
  private readonly burnerEvents: EventOfNotice[]

  constructor(
    logger: Logger,
    cache: StethOperationCache,
    ethProvider: IStethClient,
    depositSecurityAddress: string,
    lidoStethAddress: string,
    lidoDepositExecutorAddress: string,
    depositSecurityEvents: EventOfNotice[],
    lidoEvents: EventOfNotice[],
    insuranceFundEvents: EventOfNotice[],
    burnerEvents: EventOfNotice[],
  ) {
    this.logger = logger
    this.cache = cache
    this.ethProvider = ethProvider
    this.depositSecurityAddress = depositSecurityAddress
    this.lidoStethAddress = lidoStethAddress
    this.lidoDepositExecutorAddress = lidoDepositExecutorAddress

    this.depositSecurityEvents = depositSecurityEvents
    this.lidoEvents = lidoEvents
    this.insuranceFundEvents = insuranceFundEvents
    this.burnerEvents = burnerEvents
  }

  public async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()
    const history = await this.ethProvider.getHistory(
      this.depositSecurityAddress,
      currentBlock - HISTORY_BLOCK_OFFSET,
      currentBlock - 1,
    )
    if (E.isLeft(history)) {
      this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
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

    const bufferedEthRaw = await this.ethProvider.getStethBalance(this.lidoStethAddress, currentBlock)
    if (E.isLeft(bufferedEthRaw)) {
      this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
      return bufferedEthRaw.left
    }

    this.cache.setLastBufferedEth(bufferedEthRaw.right)

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [bufferedEthFindings, depositorBalanceFindings, stakingLimitFindings] = await Promise.all([
      this.handleBufferedEth(blockEvent.block.number, blockEvent.block.timestamp),
      this.handleDepositExecutorBalance(blockEvent.block.number, blockEvent.block.timestamp),
      this.handleStakingLimit(blockEvent.block.number, blockEvent.block.timestamp),
      this.handleShareRateChange(blockEvent.block.number),
    ])

    findings.push(...bufferedEthFindings, ...depositorBalanceFindings, ...stakingLimitFindings)
    this.logger.info(elapsedTime(StethOperationSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleShareRateChange(blockNumber: number): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    if (this.cache.getShareRate().blockNumber !== 0) {
      const shareRate = await this.ethProvider.getShareRate(blockNumber)
      if (E.isLeft(shareRate)) {
        return [
          networkAlert(
            shareRate.left,
            `Error in ${StethOperationSrv.name}.${this.handleShareRateChange.name}:137`,
            `Could not call ethProvider.getShareRate`,
          ),
        ]
      }

      const shareRateFromReport = this.cache.getShareRate()
      if (!shareRate.right.eq(shareRateFromReport.amount)) {
        const percentsFromReportedShareRate = shareRate.right.div(shareRateFromReport.amount).multipliedBy(100)
        const deviation = 100.0 - percentsFromReportedShareRate.toNumber()

        // deviation by 0.0001 (1 bp or 0.01%)
        if (Math.abs(deviation) >= 0.01) {
          findings.push(
            Finding.fromObject({
              name: `🚨🚨🚨 Share rate unexpected has changed`,
              description:
                `Prev.shareRate(${shareRateFromReport.blockNumber}) = ${shareRateFromReport.amount.toNumber()} \n` +
                `Curr.shareRate(${blockNumber}) = ${shareRate.right.toNumber()} \n` +
                `Diff: ${shareRate.right.minus(shareRateFromReport.amount).toNumber()}`,
              alertId: 'LIDO-INVARIANT-ERROR',
              severity: FindingSeverity.Critical,
              type: FindingType.Suspicious,
            }),
          )
        }
      }
    }

    this.logger.info(elapsedTime(StethOperationSrv.name + '.' + this.handleShareRateChange.name, start))

    return findings
  }

  public async handleTransaction(txEvent: TransactionEventContract, blockNumber: number): Promise<Finding[]> {
    const out: Finding[] = []

    if (txEvent.to == this.depositSecurityAddress) {
      this.cache.setLastDepositorTxTime(txEvent.timestamp)
    }

    const depositSecFindings = this.handleEventsOfNotice(txEvent, this.depositSecurityEvents)
    const lidoFindings = this.handleEventsOfNotice(txEvent, this.lidoEvents)
    const insuranceFundFindings = this.handleEventsOfNotice(txEvent, this.insuranceFundEvents)
    const burnerFindings = this.handleEventsOfNotice(txEvent, this.burnerEvents)
    out.push(...depositSecFindings, ...lidoFindings, ...insuranceFundFindings, ...burnerFindings)

    for (const f of lidoFindings) {
      if (f.alertId === alertId_token_rebased) {
        const shareRate = await this.ethProvider.getShareRate(blockNumber)
        if (E.isLeft(shareRate)) {
          const f: Finding = networkAlert(
            shareRate.left,
            `Error in ${StethOperationSrv.name}.${this.handleTransaction.name}:192`,
            `Could not call ethProvider.getShareRate`,
          )

          out.push(f)
        } else {
          this.cache.setShareRate({
            amount: shareRate.right,
            blockNumber: blockNumber,
          })
        }
      }
    }

    return out
  }

  public handleEventsOfNotice(txEvent: TransactionEventContract, eventsOfNotice: EventOfNotice[]) {
    const out: Finding[] = []
    for (const eventInfo of eventsOfNotice) {
      if (formatAddressAsForta(eventInfo.address) in txEvent.addresses) {
        const filteredEvents = txEvent.filterLog(eventInfo.event, eventInfo.address)

        for (const filteredEvent of filteredEvents) {
          out.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(filteredEvent.args),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: eventInfo.type,
              metadata: { args: String(filteredEvent.args) },
            }),
          )
        }
      }
    }

    return out
  }

  public async handleBufferedEth(blockNumber: number, blockTimestamp: number): Promise<Finding[]> {
    const shiftedBlockNumber = blockNumber - 3
    const [bufferedEthRaw, shifte3dBufferedEthRaw, shifte4dBufferedEthRaw] = await Promise.all([
      this.ethProvider.getBufferedEther(blockNumber),
      this.ethProvider.getBufferedEther(shiftedBlockNumber),
      this.ethProvider.getBufferedEther(shiftedBlockNumber - 1),
    ])

    if (E.isLeft(bufferedEthRaw)) {
      return [
        networkAlert(
          bufferedEthRaw.left,
          `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:240`,
          `Could not call ethProvider.bufferedEthRaw`,
        ),
      ]
    }

    if (E.isLeft(shifte3dBufferedEthRaw)) {
      return [
        networkAlert(
          shifte3dBufferedEthRaw.left,
          `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:241`,
          `Could not call ethProvider.shifte3dBufferedEthRaw`,
        ),
      ]
    }

    if (E.isLeft(shifte4dBufferedEthRaw)) {
      return [
        networkAlert(
          shifte4dBufferedEthRaw.left,
          `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:242`,
          `Could not call ethProvider.shifte4dBufferedEthRaw`,
        ),
      ]
    }

    const out: Finding[] = []
    if (shifte3dBufferedEthRaw.right.lt(shifte4dBufferedEthRaw.right)) {
      const [unbufferedEvents, wdReqFinalizedEvents] = await Promise.all([
        this.ethProvider.getUnbufferedEvents(shiftedBlockNumber, shiftedBlockNumber),
        this.ethProvider.getWithdrawalsFinalizedEvents(shiftedBlockNumber, shiftedBlockNumber),
      ])

      if (E.isLeft(unbufferedEvents)) {
        return [
          networkAlert(
            unbufferedEvents.left,
            `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:278`,
            `Could not call ethProvider.getUnbufferedEvents`,
          ),
        ]
      }

      if (E.isLeft(wdReqFinalizedEvents)) {
        return [
          networkAlert(
            wdReqFinalizedEvents.left,
            `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:279`,
            `Could not call ethProvider.getWithdrawalsFinalizedEvents`,
          ),
        ]
      }

      if (unbufferedEvents.right.length === 0 && wdReqFinalizedEvents.right.length === 0) {
        out.push(
          Finding.fromObject({
            name: '🚨🚨🚨 Buffered ETH drain',
            description:
              `Buffered ETH amount decreased from ` +
              `${shifte4dBufferedEthRaw.right.div(ETH_DECIMALS).toFixed(2)} ` +
              `to ${shifte3dBufferedEthRaw.right.div(ETH_DECIMALS).toFixed(2)} ` +
              `without Unbuffered or WithdrawalsFinalized events\n\n` +
              `Note: actual handled block number is ${shiftedBlockNumber}`,
            alertId: 'BUFFERED-ETH-DRAIN',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
      }
    }

    if (blockNumber % BLOCK_CHECK_INTERVAL === 0) {
      const depositableEtherRaw = await this.ethProvider.getDepositableEther(blockNumber)
      if (E.isLeft(depositableEtherRaw)) {
        return [
          networkAlert(
            depositableEtherRaw.left,
            `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:321`,
            `Could not call ethProvider.getDepositableEther`,
          ),
        ]
      }
      const depositableEther = depositableEtherRaw.right.div(ETH_DECIMALS).toNumber()

      // Keep track of buffer size above MAX_BUFFERED_ETH_AMOUNT_CRITICAL
      if (depositableEther > MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL) {
        if (this.cache.getCriticalDepositableAmountTimestamp() === 0) {
          this.cache.setCriticalDepositableAmountTimestamp(blockTimestamp)
        }
      } else {
        // reset counter if buffered amount goes below MAX_BUFFERED_ETH_AMOUNT_CRITICAL
        this.cache.setCriticalDepositableAmountTimestamp(0)
      }

      if (this.cache.getLastReportedDepositableEthTimestamp() + REPORT_WINDOW < blockTimestamp) {
        if (
          depositableEther > MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL &&
          this.cache.getCriticalDepositableAmountTimestamp() + MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME < blockTimestamp
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
              type: FindingType.Suspicious,
            }),
          )
          this.cache.setLastReportedDepositableEthTimestamp(blockTimestamp)
        } else if (
          depositableEther > MAX_DEPOSITABLE_ETH_AMOUNT_MEDIUM &&
          this.cache.getLastDepositorTxTime() !== 0 &&
          this.cache.getLastDepositorTxTime() + MAX_DEPOSITOR_TX_DELAY < blockTimestamp
        ) {
          const bufferedEth = bufferedEthRaw.right.div(ETH_DECIMALS).toNumber()

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
          this.cache.setLastReportedDepositableEthTimestamp(blockTimestamp)
        }
      }
    }

    return out
  }

  public async handleDepositExecutorBalance(blockNumber: number, currentBlockTimestamp: number): Promise<Finding[]> {
    const out: Finding[] = []
    if (blockNumber % BLOCK_CHECK_INTERVAL === 0) {
      if (
        this.cache.getLastReportedExecutorBalanceTimestamp() + REPORT_WINDOW_EXECUTOR_BALANCE <
        currentBlockTimestamp
      ) {
        const executorBalanceRaw = await this.ethProvider.getBalance(this.lidoDepositExecutorAddress, blockNumber)
        if (E.isLeft(executorBalanceRaw)) {
          return [
            networkAlert(
              executorBalanceRaw.left,
              `Error in ${StethOperationSrv.name}.${this.handleDepositExecutorBalance.name}:396`,
              `Could not call ethProvider.getBalance`,
            ),
          ]
        }

        const executorBalance = executorBalanceRaw.right.div(ETH_DECIMALS).toNumber()
        if (executorBalance < MIN_DEPOSIT_EXECUTOR_BALANCE) {
          this.cache.setLastReportedExecutorBalanceTimestamp(currentBlockTimestamp)
          out.push(
            Finding.fromObject({
              name: '⚠️ Low deposit executor balance',
              description:
                `Balance of deposit executor is ${executorBalance.toFixed(4)}. ` + `This is extremely low! 😱`,
              alertId: 'LOW-DEPOSIT-EXECUTOR-BALANCE',
              severity: FindingSeverity.Medium,
              type: FindingType.Suspicious,
            }),
          )
        }
      }
    }

    return out
  }

  public async handleStakingLimit(blockNumber: number, currentBlockTimestamp: number): Promise<Finding[]> {
    const out: Finding[] = []
    if (blockNumber % BLOCK_CHECK_INTERVAL_SMAll === 0) {
      const stakingLimitInfo = await this.ethProvider.getStakingLimitInfo(blockNumber)
      if (E.isLeft(stakingLimitInfo)) {
        return [
          networkAlert(
            stakingLimitInfo.left,
            `Error in ${StethOperationSrv.name}.${this.handleStakingLimit.name}:430`,
            `Could not call ethProvider.getStakingLimitInfo`,
          ),
        ]
      }

      const currentStakingLimit = stakingLimitInfo.right.currentStakeLimit
      const maxStakingLimit = stakingLimitInfo.right.maxStakeLimit

      if (
        this.cache.getLastReportedStakingLimit10Timestamp() + REPORT_WINDOW_STAKING_LIMIT_10 < currentBlockTimestamp &&
        currentStakingLimit.isLessThan(maxStakingLimit.times(0.1))
      ) {
        out.push(
          Finding.fromObject({
            name: '⚠️ Unspent staking limit below 10%',
            description: `Current staking limit is lower than 10% of max staking limit`,
            alertId: 'LOW-STAKING-LIMIT',
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          }),
        )
        this.cache.setLastReportedStakingLimit10Timestamp(currentBlockTimestamp)
      } else if (
        this.cache.getLastReportedStakingLimit30Timestamp() + REPORT_WINDOW_STAKING_LIMIT_30 < currentBlockTimestamp &&
        currentStakingLimit.isLessThan(maxStakingLimit.times(0.3))
      ) {
        out.push(
          Finding.fromObject({
            name: '📉 Unspent staking limit below 30%',
            description:
              `Current staking limit is ${currentStakingLimit.toFixed(2)} ETH ` +
              `this is lower than 30% of max staking limit ` +
              `${maxStakingLimit.toFixed(2)} ETH`,
            alertId: 'LOW-STAKING-LIMIT',
            severity: FindingSeverity.Info,
            type: FindingType.Info,
          }),
        )
        this.cache.setLastReportedStakingLimit30Timestamp(currentBlockTimestamp)
      }
    }

    return out
  }

  public getStorage(): StethOperationCache {
    return this.cache
  }
}
