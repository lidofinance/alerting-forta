import type { BigNumber } from 'bignumber.js'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto, EventOfNotice, handleEventsOfNotice, TransactionDto } from '../../entity/events'
import { StakingLimitInfo } from '../../entity/staking_limit_info'
import { Finding } from '../../generated/proto/alert_pb'
import type { TypedEvent } from '../../generated/typechain/common'
import { UnbufferedEvent } from '../../generated/typechain/Lido'
import { ETH_DECIMALS } from '../../utils/constants'
import { networkAlert } from '../../utils/errors'
import { alertId_token_rebased } from '../../utils/events/lido_events'
import { elapsedTime } from '../../utils/time'
import { StethOperationCache } from './StethOperation.cache'

// Formula: (60 * 60 * 24 * 7) / 12 = 50_400
const HOURS_24 = 60 * 60 * 24 // 24 hours
export const DAYS_7_IN_BLOCKS: number = Math.floor((HOURS_24 * 7) / 12)
const ONCE_PER_100_BLOCKS: number = 100
const ONCE_PER_25_BLOCKS: number = 25
export const ETH_10K = 10_000 // 10000 ETH
export const ETH_20K: number = 20_000 // 20000 ETH
export const HOUR_1 = 60 * 60 // 1 hour
const HOURS_4 = 60 * 60 * 4 // 4 Hours
const HOURS_12 = 60 * 60 * 12 // 12 Hours
export const DAYS_3 = 60 * 60 * 72 // 72 Hours
export const ETH_2 = 2 // 2 ETH

export abstract class IStethClient {
  public abstract getUnbufferedEvents(startBlock: number, endBlock: number): Promise<E.Either<Error, UnbufferedEvent[]>>

  public abstract getStethBalance(lidoStethAddress: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getShareRate(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getBufferedEther(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getWithdrawalsFinalizedEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<Error, TypedEvent[]>>

  public abstract getDepositableEther(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getEthBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>>

  public abstract getChainPrevBlocks(parentHash: string, depth: number): Promise<E.Either<Error, BlockDto[]>>

  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class StethOperationSrv {
  private readonly name = 'StethOperationSrv'
  private readonly logger: Logger
  private readonly cache: StethOperationCache
  private readonly stethClient: IStethClient
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
    stethClient: IStethClient,
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
    this.stethClient = stethClient
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
    const events = await this.stethClient.getUnbufferedEvents(currentBlock - DAYS_7_IN_BLOCKS, currentBlock - 1)

    if (E.isLeft(events)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return events.left
    }

    if (events.right.length > 0) {
      const latestDepositBlock = await this.stethClient.getBlockByNumber(
        events.right[events.right.length - 1].blockNumber,
      )
      if (E.isLeft(latestDepositBlock)) {
        this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
        return latestDepositBlock.left
      }

      this.cache.setLastDepositorTxTime(latestDepositBlock.right.timestamp)
    }

    const bufferedEthRaw = await this.stethClient.getStethBalance(this.lidoStethAddress, currentBlock)
    if (E.isLeft(bufferedEthRaw)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return bufferedEthRaw.left
    }

    this.cache.setLastBufferedEth(bufferedEthRaw.right)

    const currBlock = await this.stethClient.getBlockByNumber(currentBlock)
    if (E.isLeft(currBlock)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return currBlock.left
    }

    const prev4Blocks = await this.stethClient.getChainPrevBlocks(currBlock.right.parentHash, 4)
    if (E.isLeft(prev4Blocks)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return prev4Blocks.left
    }

    const shareRate = await this.stethClient.getShareRate(currentBlock)
    if (E.isLeft(shareRate)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return shareRate.left
    }

    this.cache.setShareRate({
      amount: shareRate.right,
      blockNumber: currentBlock,
    })

    this.cache.setPrev4Blocks(prev4Blocks.right)

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockDto: BlockDto) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [bufferedEthFindings, depositorBalanceFindings, stakingLimitFindings, shareRateFindings] = await Promise.all([
      this.handleBufferedEth(blockDto),
      this.handleDepositExecutorBalance(blockDto.number, blockDto.timestamp),
      this.handleStakingLimit(blockDto.number, blockDto.timestamp),
      this.handleShareRateChange(blockDto.number),
    ])

    findings.push(...bufferedEthFindings, ...depositorBalanceFindings, ...stakingLimitFindings, ...shareRateFindings)
    this.logger.info(elapsedTime(StethOperationSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleShareRateChange(blockNumber: number): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    if (this.cache.getShareRate().blockNumber !== 0) {
      const shareRate = await this.stethClient.getShareRate(blockNumber)
      if (E.isLeft(shareRate)) {
        return [
          networkAlert(
            shareRate.left,
            `Error in ${StethOperationSrv.name}.${this.handleShareRateChange.name}:137`,
            `Could not call stethClient.getShareRate`,
          ),
        ]
      }

      const shareRateFromReport = this.cache.getShareRate()
      if (!shareRate.right.eq(shareRateFromReport.amount)) {
        const percentsFromReportedShareRate = shareRate.right.div(shareRateFromReport.amount).multipliedBy(100)
        const deviation = 100.0 - percentsFromReportedShareRate.toNumber()

        // deviation by 0.0001 (1 bp or 0.01%)
        if (Math.abs(deviation) >= 0.01) {
          const f: Finding = new Finding()

          f.setName(`🚨🚨🚨 Share rate unexpected has changed`)
          f.setDescription(
            `Prev.shareRate(${shareRateFromReport.blockNumber}) = ${shareRateFromReport.amount.toNumber()} \n` +
              `Curr.shareRate(${blockNumber}) = ${shareRate.right.toNumber()} \n` +
              `Diff: ${shareRate.right.minus(shareRateFromReport.amount).toNumber()}`,
          )
          f.setAlertid('LIDO-INVARIANT-ERROR')
          f.setSeverity(Finding.Severity.CRITICAL)
          f.setType(Finding.FindingType.SUSPICIOUS)
          f.setProtocol('ethereum')

          findings.push(f)
        }
      }
    }

    this.logger.info(elapsedTime(StethOperationSrv.name + '.' + this.handleShareRateChange.name, start))

    return findings
  }

  public async handleTransaction(txEvent: TransactionDto): Promise<Finding[]> {
    const out: Finding[] = []

    if (txEvent.to !== null && txEvent.to.toLowerCase() == this.depositSecurityAddress.toLowerCase()) {
      this.cache.setLastDepositorTxTime(txEvent.block.timestamp)
    }

    const lidoFindings = handleEventsOfNotice(txEvent, this.lidoEvents)
    const depositSecFindings = handleEventsOfNotice(txEvent, this.depositSecurityEvents)
    const insuranceFundFindings = handleEventsOfNotice(txEvent, this.insuranceFundEvents)
    const burnerFindings = handleEventsOfNotice(txEvent, this.burnerEvents)

    for (const f of lidoFindings) {
      if (f.getAlertid() !== alertId_token_rebased) {
        out.push(f)
        continue
      }

      const shareRate = await this.stethClient.getShareRate(txEvent.block.number)
      if (E.isLeft(shareRate)) {
        const f: Finding = networkAlert(
          shareRate.left,
          `Error in ${StethOperationSrv.name}.${this.handleTransaction.name}:192`,
          `Could not call stethClient.getShareRate`,
        )

        out.push(f)
      } else {
        this.cache.setShareRate({
          amount: shareRate.right,
          blockNumber: txEvent.block.number,
        })
      }
    }

    out.push(...depositSecFindings, ...insuranceFundFindings, ...burnerFindings)

    return out
  }

  public async handleBufferedEth(blockDto: BlockDto): Promise<Finding[]> {
    if (this.cache.getPrev4Blocks().length === 0 || this.cache.getParentBlock().hash !== blockDto.parentHash) {
      const prev4Blocks = await this.stethClient.getChainPrevBlocks(blockDto.parentHash, 4)
      if (E.isLeft(prev4Blocks)) {
        const f: Finding = networkAlert(
          prev4Blocks.left,
          `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:255`,
          `Could not call stethClient.getChainPrevBlocks`,
        )

        return [f]
      }

      this.cache.setPrev4Blocks(prev4Blocks.right)
    }

    const prev4Blocks = this.cache.getPrev4Blocks()
    const shiftedBlockNumber = prev4Blocks[1].number
    const [bufferedEthRaw, shifte3dBufferedEthRaw, shifte4dBufferedEthRaw] = await Promise.all([
      this.stethClient.getBufferedEther(blockDto.number),
      this.stethClient.getBufferedEther(prev4Blocks[1].number),
      this.stethClient.getBufferedEther(prev4Blocks[0].number),
    ])

    if (E.isLeft(bufferedEthRaw)) {
      return [
        networkAlert(
          bufferedEthRaw.left,
          `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:240`,
          `Could not call stethClient.bufferedEthRaw`,
        ),
      ]
    }

    if (E.isLeft(shifte3dBufferedEthRaw)) {
      return [
        networkAlert(
          shifte3dBufferedEthRaw.left,
          `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:241`,
          `Could not call stethClient.shifte3dBufferedEthRaw`,
        ),
      ]
    }

    if (E.isLeft(shifte4dBufferedEthRaw)) {
      return [
        networkAlert(
          shifte4dBufferedEthRaw.left,
          `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:242`,
          `Could not call stethClient.shifte4dBufferedEthRaw`,
        ),
      ]
    }

    const out: Finding[] = []
    if (shifte3dBufferedEthRaw.right.lt(shifte4dBufferedEthRaw.right)) {
      const [unbufferedEvents, wdReqFinalizedEvents] = await Promise.all([
        this.stethClient.getUnbufferedEvents(shiftedBlockNumber, shiftedBlockNumber),
        this.stethClient.getWithdrawalsFinalizedEvents(shiftedBlockNumber, shiftedBlockNumber),
      ])

      if (E.isLeft(unbufferedEvents)) {
        return [
          networkAlert(
            unbufferedEvents.left,
            `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:278`,
            `Could not call stethClient.getUnbufferedEvents`,
          ),
        ]
      }

      if (E.isLeft(wdReqFinalizedEvents)) {
        return [
          networkAlert(
            wdReqFinalizedEvents.left,
            `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:279`,
            `Could not call stethClient.getWithdrawalsFinalizedEvents`,
          ),
        ]
      }

      if (unbufferedEvents.right.length === 0 && wdReqFinalizedEvents.right.length === 0) {
        const f: Finding = new Finding()
        f.setName('🚨🚨🚨 Buffered ETH drain')
        f.setDescription(
          `Buffered ETH amount decreased from ` +
            `${shifte4dBufferedEthRaw.right.div(ETH_DECIMALS).toFixed(2)} ` +
            `to ${shifte3dBufferedEthRaw.right.div(ETH_DECIMALS).toFixed(2)} ` +
            `without Unbuffered or WithdrawalsFinalized events\n\n` +
            `Note: actual handled block number is ${shiftedBlockNumber}`,
        )
        f.setAlertid('BUFFERED-ETH-DRAIN')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        out.push(f)
      }
    }

    if (blockDto.number % ONCE_PER_100_BLOCKS === 0) {
      const depositableEtherRaw = await this.stethClient.getDepositableEther(blockDto.number)
      if (E.isLeft(depositableEtherRaw)) {
        return [
          networkAlert(
            depositableEtherRaw.left,
            `Error in ${StethOperationSrv.name}.${this.handleBufferedEth.name}:321`,
            `Could not call stethClient.getDepositableEther`,
          ),
        ]
      }
      const depositableEther = depositableEtherRaw.right.div(ETH_DECIMALS).toNumber()

      // Keep track of buffer size above MAX_BUFFERED_ETH_AMOUNT_CRITICAL
      if (depositableEther > ETH_20K) {
        if (this.cache.getCriticalDepositableAmountTimestamp() === 0) {
          this.cache.setCriticalDepositableAmountTimestamp(blockDto.timestamp)
        }
      } else {
        // reset counter if buffered amount goes below MAX_BUFFERED_ETH_AMOUNT_CRITICAL
        this.cache.setCriticalDepositableAmountTimestamp(0)
      }

      if (this.cache.getLastReportedDepositableEthTimestamp() + HOURS_24 < blockDto.timestamp) {
        if (
          depositableEther > ETH_20K &&
          this.cache.getCriticalDepositableAmountTimestamp() + HOUR_1 < blockDto.timestamp
        ) {
          out.push(
            new Finding()
              .setName('🚨 Huge depositable ETH amount')
              .setDescription(
                `There are ${depositableEther.toFixed(2)} ` +
                  `depositable ETH in DAO for more than ` +
                  `${Math.floor(HOUR_1 / (60 * 60))} hour(s)`,
              )
              .setAlertid('HUGE-DEPOSITABLE-ETH')
              .setSeverity(Finding.Severity.HIGH)
              .setType(Finding.FindingType.SUSPICIOUS)
              .setProtocol('ethereum'),
          )

          this.cache.setLastReportedDepositableEthTimestamp(blockDto.timestamp)
        } else if (
          depositableEther > ETH_10K &&
          this.cache.getLastDepositorTxTime() !== 0 &&
          this.cache.getLastDepositorTxTime() + DAYS_3 < blockDto.timestamp
        ) {
          const bufferedEth = bufferedEthRaw.right.div(ETH_DECIMALS).toNumber()

          const f: Finding = new Finding()
          f.setName('⚠️ High depositable ETH amount')
          f.setDescription(
            `There are: \n` +
              `Buffered: ${bufferedEth.toFixed(2)} \n` +
              `Depositable: ${depositableEther.toFixed(2)} \n` +
              `ETH in DAO and there are more than ${Math.floor(DAYS_3 / (60 * 60))} hours since last Depositor TX`,
          )
          f.setAlertid('HIGH-DEPOSITABLE-ETH')
          f.setSeverity(Finding.Severity.MEDIUM)
          f.setType(Finding.FindingType.SUSPICIOUS)
          f.setProtocol('ethereum')
          out.push(f)

          this.cache.setLastReportedDepositableEthTimestamp(blockDto.timestamp)
        }
      }
    }

    this.cache.setPrevBlock(blockDto)

    return out
  }

  public async handleDepositExecutorBalance(blockNumber: number, currentBlockTimestamp: number): Promise<Finding[]> {
    const out: Finding[] = []
    if (blockNumber % ONCE_PER_100_BLOCKS === 0) {
      if (this.cache.getLastReportedExecutorBalanceTimestamp() + HOURS_4 < currentBlockTimestamp) {
        const executorBalanceRaw = await this.stethClient.getEthBalance(this.lidoDepositExecutorAddress, blockNumber)
        if (E.isLeft(executorBalanceRaw)) {
          return [
            networkAlert(
              executorBalanceRaw.left,
              `Error in ${StethOperationSrv.name}.${this.handleDepositExecutorBalance.name}:396`,
              `Could not call stethClient.getBalance`,
            ),
          ]
        }

        const executorBalance = executorBalanceRaw.right.div(ETH_DECIMALS).toNumber()
        if (executorBalance < ETH_2) {
          this.cache.setLastReportedExecutorBalanceTimestamp(currentBlockTimestamp)

          const f: Finding = new Finding()
          f.setName('⚠️ Low deposit executor balance')
          f.setDescription(
            `Balance of deposit executor is ${executorBalance.toFixed(4)}. ` + `This is extremely low! 😱`,
          )
          f.setAlertid('LOW-DEPOSIT-EXECUTOR-BALANCE')
          f.setSeverity(Finding.Severity.MEDIUM)
          f.setType(Finding.FindingType.SUSPICIOUS)
          f.setProtocol('ethereum')
          out.push(f)
        }
      }
    }

    return out
  }

  public async handleStakingLimit(blockNumber: number, currentBlockTimestamp: number): Promise<Finding[]> {
    const out: Finding[] = []
    if (blockNumber % ONCE_PER_25_BLOCKS === 0) {
      const stakingLimitInfo = await this.stethClient.getStakingLimitInfo(blockNumber)
      if (E.isLeft(stakingLimitInfo)) {
        return [
          networkAlert(
            stakingLimitInfo.left,
            `Error in ${StethOperationSrv.name}.${this.handleStakingLimit.name}:430`,
            `Could not call stethClient.getStakingLimitInfo`,
          ),
        ]
      }

      const currentStakingLimit = stakingLimitInfo.right.currentStakeLimit
      const maxStakingLimit = stakingLimitInfo.right.maxStakeLimit

      if (
        this.cache.getLastReportedStakingLimit10Timestamp() + HOURS_12 < currentBlockTimestamp &&
        currentStakingLimit.isLessThan(maxStakingLimit.times(0.1))
      ) {
        const f: Finding = new Finding()
        f.setName('⚠️ Unspent staking limit below 10%')
        f.setDescription(`Current staking limit is lower than 10% of max staking limit`)
        f.setAlertid('LOW-STAKING-LIMIT')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')
        out.push(f)

        this.cache.setLastReportedStakingLimit10Timestamp(currentBlockTimestamp)
      } else if (
        this.cache.getLastReportedStakingLimit30Timestamp() + HOURS_12 < currentBlockTimestamp &&
        currentStakingLimit.isLessThan(maxStakingLimit.times(0.3))
      ) {
        const f: Finding = new Finding()
        f.setName('📉 Unspent staking limit below 30%')
        f.setDescription(
          `Current staking limit is ${currentStakingLimit.toFixed(2)} ETH ` +
            `this is lower than 30% of max staking limit ` +
            `${maxStakingLimit.toFixed(2)} ETH`,
        )
        f.setAlertid('LOW-STAKING-LIMIT')
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')
        out.push(f)

        this.cache.setLastReportedStakingLimit30Timestamp(currentBlockTimestamp)
      }
    }

    return out
  }

  public getStorage(): StethOperationCache {
    return this.cache
  }

  public getLidoStethAddress(): string {
    return this.lidoStethAddress.toLowerCase()
  }
}
