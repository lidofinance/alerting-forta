import BigNumber from 'bignumber.js'
import { WithdrawalsCache } from './Withdrawals.cache'
import { either as E } from 'fp-ts'
import { ETH_DECIMALS } from '../../utils/constants'
import { elapsedTime, formatDelay } from '../../utils/time'
import {
  LIDO_TOKEN_REBASED_EVENT,
  WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT,
  WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED_EVENT,
  WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
  WITHDRAWALS_BUNKER_MODE_DISABLED_EVENT,
  WITHDRAWALS_BUNKER_MODE_ENABLED_EVENT,
} from '../../utils/events/withdrawals_events'
import { etherscanAddress, etherscanNft } from '../../utils/string'
import { EventOfNotice, handleEventsOfNotice, TransactionDto } from '../../entity/events'
import { Logger } from 'winston'
import { WithdrawalRequest } from '../../entity/withdrawal_request'
import { WithdrawalsRepo } from './Withdrawals.repo'
import { dbAlert, networkAlert } from '../../utils/errors'
import { BlockDto } from '../../entity/events'
import { StakingLimitInfo } from '../../entity/staking_limit_info'
import { Finding } from '../../generated/proto/alert_pb'
import { filterLog } from 'forta-agent'
import { WithdrawalClaimedEvent } from '../../generated/typechain/WithdrawalQueueERC721'

const ONE_HOUR = 60 * 60
const ONE_DAY = ONE_HOUR * 24
const FIVE_DAYS = ONE_DAY * 5
const TWO_WEEKS = 14 * ONE_DAY // 2 weeks

const THRESHOLD_OF_100K_STETH = new BigNumber(100_000)
const THRESHOLD_OF_5K_STETH = new BigNumber(5_000)
const THRESHOLD_OF_150K_STETH = new BigNumber(150_000)

const ONCE_PER_100_BLOCKS = 100 // 20 minutes (100 blocks x 12 sec = 12000 seconds = 20 minutes)
const THRESHOLD_095 = 0.95
const THRESHOLD_02 = 0.2
const CLAIMED_MORE_THEN_REQUESTED_5_ATTEMPT_PER_HOUR = 5

export abstract class IWithdrawalsClient {
  public abstract getUnfinalizedStETH(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getWithdrawalStatuses(
    requestIds: number[],
    currentBlock: number,
  ): Promise<E.Either<Error, WithdrawalRequest[]>>

  public abstract getTotalPooledEther(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract getTotalShares(blockNumber: number): Promise<E.Either<Error, BigNumber>>

  public abstract isBunkerModeActive(blockNumber: number): Promise<E.Either<Error, boolean>>

  public abstract getBunkerTimestamp(blockNumber: number): Promise<E.Either<Error, number>>

  public abstract getWithdrawalLastRequestId(blockNumber: number): Promise<E.Either<Error, number>>

  public abstract getWithdrawalStatus(
    requestId: number,
    blockNumber: number,
  ): Promise<E.Either<Error, WithdrawalRequest>>

  public abstract getEthBalance(address: string, block: number): Promise<E.Either<Error, BigNumber>>

  public abstract getStakingLimitInfo(blockNumber: number): Promise<E.Either<Error, StakingLimitInfo>>

  public abstract getClaimedEvents(currentBlock: number): Promise<E.Either<Error, WithdrawalClaimedEvent[]>>
}

export class WithdrawalsSrv {
  private name = `WithdrawalsSrv`

  private readonly logger: Logger
  private readonly repo: WithdrawalsRepo
  private readonly cache: WithdrawalsCache
  private readonly ethProvider: IWithdrawalsClient
  private readonly withdrawalsEvents: EventOfNotice[]

  private readonly withdrawalsQueueAddress: string
  private readonly lidoStethAddress: string

  constructor(
    logger: Logger,
    repo: WithdrawalsRepo,
    ethProvider: IWithdrawalsClient,
    cache: WithdrawalsCache,
    withdrawalsEvents: EventOfNotice[],
    withdrawalsQueueAddress: string,
    lidoStethAddress: string,
  ) {
    this.logger = logger
    this.repo = repo
    this.ethProvider = ethProvider
    this.cache = cache
    this.withdrawalsEvents = withdrawalsEvents
    this.withdrawalsQueueAddress = withdrawalsQueueAddress
    this.lidoStethAddress = lidoStethAddress
  }

  async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    const isBunkerMode = await this.ethProvider.isBunkerModeActive(currentBlock)
    if (E.isLeft(isBunkerMode)) {
      this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
      return isBunkerMode.left
    }

    this.cache.setIsBunkerMode(isBunkerMode.right)

    if (this.cache.getIsBunkerMode()) {
      const bunkerModeSinceTimestamp = await this.ethProvider.getBunkerTimestamp(currentBlock)
      if (E.isLeft(bunkerModeSinceTimestamp)) {
        this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
        return bunkerModeSinceTimestamp.left
      }

      this.cache.setBunkerModeEnabledSinceTimestamp(bunkerModeSinceTimestamp.right)
    }

    const err = await this.fillUpWithdrawalStatusesTable(currentBlock)
    if (err !== null) {
      this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
      return err
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  async fillUpWithdrawalStatusesTable(currentBlock: number): Promise<Error | null> {
    const [cached, latest] = await Promise.all([
      this.repo.getLastRequestId(),
      this.ethProvider.getWithdrawalLastRequestId(currentBlock),
    ])

    if (E.isLeft(latest)) {
      return latest.left
    }

    if (E.isLeft(cached)) {
      return cached.left
    }

    const requests: number[] = []
    const firstRequestId = cached.right === 0 ? 1 : cached.right
    for (let i = firstRequestId; i <= latest.right; i++) {
      requests.push(i)
    }

    const requestStatuses = await this.ethProvider.getWithdrawalStatuses(requests, currentBlock)
    if (E.isLeft(requestStatuses)) {
      return requestStatuses.left
    }

    const insertErr = await this.repo.createOrUpdate(requestStatuses.right)
    if (insertErr !== null) {
      return insertErr
    }

    /*
    Need when we have to prefill up db (Don't remove)
    const claimedRequests = await this.ethProvider.getClaimedEvents(currentBlock - 1000)
    if (E.isLeft(claimedRequests)) {
      return claimedRequests.left
    }

    const claimedRequestIds: number[] = []
    for (const e of claimedRequests.right) {
      claimedRequestIds.push(new BigNumber(e.args.requestId.toString()).toNumber())
    }

    await this.repo.removeByIds(claimedRequestIds)*/

    return null
  }

  public getName(): string {
    return this.name
  }

  async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const chainLastRequestId = await this.ethProvider.getWithdrawalLastRequestId(blockDto.number)
    if (E.isLeft(chainLastRequestId)) {
      return [
        networkAlert(
          chainLastRequestId.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleBlock.name}:138`,
          `Could not call ethProvider.getWithdrawalLastRequestId`,
        ),
      ]
    }

    const dbLastRequestId = await this.repo.getLastRequestId()
    if (E.isLeft(dbLastRequestId)) {
      return [
        dbAlert(
          dbLastRequestId.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleBlock.name}:149`,
          `Could not call repo.getLastRequestId`,
        ),
      ]
    }

    // db is outdated
    // fetch requests and store them in db
    if (chainLastRequestId.right > dbLastRequestId.right) {
      const requestIds: number[] = []
      for (let i = dbLastRequestId.right; i <= chainLastRequestId.right; i++) {
        requestIds.push(i)
      }

      const requests = await this.ethProvider.getWithdrawalStatuses(requestIds, blockDto.number)
      if (E.isLeft(requests)) {
        return [
          networkAlert(
            requests.left,
            `Error in ${WithdrawalsSrv.name}.${this.handleBlock.name}:168`,
            `Could not call ethProvider.getWithdrawalStatuses`,
          ),
        ]
      }

      const insErr = await this.repo.createOrUpdate(requests.right)
      if (insErr !== null) {
        return [
          dbAlert(
            insErr,
            `Error in ${WithdrawalsSrv.name}.${this.handleBlock.name}:179`,
            `Could not call repo.createOrUpdate`,
          ),
        ]
      }
    }

    if (blockDto.number % ONCE_PER_100_BLOCKS === 0) {
      const [queueOnParWithStakeLimitFindings, unfinalizedRequestNumberFindings, unclaimedRequestsFindings] =
        await Promise.all([
          this.handleQueueOnParWithStakeLimit(blockDto),
          this.handleUnfinalizedRequestNumber(blockDto),
          this.handleUnclaimedRequests(blockDto),
        ])

      findings.push(
        ...queueOnParWithStakeLimitFindings,
        ...unfinalizedRequestNumberFindings,
        ...unclaimedRequestsFindings,
      )
    }

    this.logger.info(elapsedTime(WithdrawalsSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleTransaction(txEvent: TransactionDto): Promise<Finding[]> {
    const out: Finding[] = []

    const withdrawalsEventsFindings = handleEventsOfNotice(txEvent, this.withdrawalsEvents)
    const bunkerStatusFindings = this.handleBunkerStatus(txEvent)
    this.handleLastTokenRebase(txEvent)

    const [finalizedFindings, withdrawalRequestFindings, withdrawalClaimedFindings] = await Promise.all([
      this.handleWithdrawalFinalized(txEvent),
      this.handleWithdrawalRequest(txEvent),
      this.handleWithdrawalClaimed(txEvent),
    ])

    out.push(
      ...bunkerStatusFindings,
      ...finalizedFindings,
      ...withdrawalRequestFindings,
      ...withdrawalClaimedFindings,
      ...withdrawalsEventsFindings,
    )

    return out
  }

  public async handleQueueOnParWithStakeLimit(blockDto: BlockDto): Promise<Finding[]> {
    const blockTimestamp = blockDto.timestamp

    if (blockTimestamp - this.cache.getLastQueueOnParStakeLimitAlertTimestamp() <= ONE_DAY) {
      return []
    }

    const stakeLimitFullInfo = await this.ethProvider.getStakingLimitInfo(blockDto.number)
    if (E.isLeft(stakeLimitFullInfo)) {
      return [
        networkAlert(
          stakeLimitFullInfo.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleQueueOnParWithStakeLimit.name}:243`,
          `Could not call ethProvider.getStakingLimitInfo`,
        ),
      ]
    }

    const unfinalizedStETH = await this.ethProvider.getUnfinalizedStETH(blockDto.number)
    if (E.isLeft(unfinalizedStETH)) {
      return [
        networkAlert(
          unfinalizedStETH.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleQueueOnParWithStakeLimit.name}:254`,
          `Could not call ethProvider.getUnfinalizedStETH`,
        ),
      ]
    }

    if (stakeLimitFullInfo.right.isStakingPaused || unfinalizedStETH.right.eq(0)) {
      return []
    }
    const spentStakeLimit = stakeLimitFullInfo.right.maxStakeLimit.minus(stakeLimitFullInfo.right.currentStakeLimit)
    const spentStakeLimitRate = spentStakeLimit.div(stakeLimitFullInfo.right.maxStakeLimit)
    const thresholdStakeLimit = stakeLimitFullInfo.right.maxStakeLimit.times(THRESHOLD_095)

    const findings: Finding[] = []
    if (spentStakeLimit.gte(thresholdStakeLimit) && unfinalizedStETH.right.gte(thresholdStakeLimit)) {
      const f: Finding = new Finding()
      f.setName(
        `⚠️ Withdrawals: ${spentStakeLimitRate.times(
          100,
        )}% of stake limit is drained and unfinalized queue is on par with drained stake limit`,
      )
      f.setDescription(
        `Unfinalized queue: ${unfinalizedStETH.right.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
          `Spent stake limit: ${spentStakeLimit.div(ETH_DECIMALS).toFixed(2)} stETH`,
      )
      f.setAlertid('WITHDRAWALS-UNFINALIZED-QUEUE-AND-STAKE-LIMIT')
      f.setSeverity(Finding.Severity.MEDIUM)
      f.setType(Finding.FindingType.SUSPICIOUS)
      f.setProtocol('ethereum')

      findings.push(f)

      this.cache.setLastQueueOnParStakeLimitAlertTimestamp(blockTimestamp)
    }

    return findings
  }

  public async handleUnfinalizedRequestNumber(blockDto: BlockDto): Promise<Finding[]> {
    const currentBlockTimestamp = blockDto.timestamp

    let unfinalizedStETH = new BigNumber(0)

    const out: Finding[] = []
    const lastFinalizedRequest = await this.repo.getLastFinalizedRequest()
    if (E.isLeft(lastFinalizedRequest)) {
      return [
        dbAlert(
          lastFinalizedRequest.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnfinalizedRequestNumber.name}:298`,
          `Could not call repo.getLastFinalizedRequest`,
        ),
      ]
    }

    const firstUnfinalizedRequest = await this.repo.getFirstUnfinalizedRequest()
    if (E.isLeft(firstUnfinalizedRequest)) {
      return [
        dbAlert(
          firstUnfinalizedRequest.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnfinalizedRequestNumber.name}:309`,
          `Could not call repo.getFirstUnfinalizedRequest`,
        ),
      ]
    }

    if (currentBlockTimestamp >= lastFinalizedRequest.right.timestamp) {
      const unfinalizedStETHraw = await this.ethProvider.getUnfinalizedStETH(blockDto.number)
      if (E.isLeft(unfinalizedStETHraw)) {
        return [
          networkAlert(
            unfinalizedStETHraw.left,
            `Error in ${WithdrawalsSrv.name}.${this.handleUnfinalizedRequestNumber.name}:309`,
            `Could not call ethProvider.getUnfinalizedStETH`,
          ),
        ]
      }

      unfinalizedStETH = unfinalizedStETHraw.right.div(ETH_DECIMALS)
      if (currentBlockTimestamp - this.cache.getLastBigUnfinalizedQueueAlertTimestamp() > ONE_DAY) {
        if (unfinalizedStETH.gte(THRESHOLD_OF_100K_STETH)) {
          // if alert hasn't been sent after last finalized batch
          // and unfinalized queue is more than `THRESHOLD_OF_100K_STETH` StETH

          const f: Finding = new Finding()
          f.setName(`⚠️ Withdrawals: unfinalized queue is more than ${THRESHOLD_OF_100K_STETH} stETH`)
          f.setDescription(`Unfinalized queue is ${unfinalizedStETH.toFixed(2)} stETH`)
          f.setAlertid('WITHDRAWALS-BIG-UNFINALIZED-QUEUE')
          f.setSeverity(Finding.Severity.MEDIUM)
          f.setType(Finding.FindingType.INFORMATION)
          f.setProtocol('ethereum')

          out.push(f)

          this.cache.setLastBigUnfinalizedQueueAlertTimestamp(currentBlockTimestamp)
        }
      }
    }

    if (!this.cache.getIsBunkerMode() && unfinalizedStETH.gt(0)) {
      if (currentBlockTimestamp - FIVE_DAYS > firstUnfinalizedRequest.right.timestamp) {
        const timeSinceLastAlert = currentBlockTimestamp - this.cache.getLastLongUnfinalizedQueueAlertTimestamp()

        if (timeSinceLastAlert > ONE_DAY) {
          // if we are in turbo mode and unfinalized queue is not finalized for 5 days
          // and alert hasn't been sent for 1 day
          const f: Finding = new Finding()
          f.setName(`⚠️ Withdrawals: unfinalized queue wait time is more than ${FIVE_DAYS / ONE_DAY} days`)
          f.setDescription(
            `Withdrawal request #${firstUnfinalizedRequest.right.id} has been waiting for ${formatDelay(
              currentBlockTimestamp - firstUnfinalizedRequest.right.timestamp,
            )} at the moment`,
          )
          f.setAlertid('WITHDRAWALS-LONG-UNFINALIZED-QUEUE')
          f.setSeverity(Finding.Severity.MEDIUM)
          f.setType(Finding.FindingType.INFORMATION)
          f.setProtocol('ethereum')

          out.push(f)

          this.cache.setLastLongUnfinalizedQueueAlertTimestamp(currentBlockTimestamp)
        }
      }
    }

    return out
  }

  public async handleUnclaimedRequests(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []
    const currentBlockTimestamp = blockDto.timestamp

    const outdatedClaimedReqIds: number[] = []
    let unclaimedStETH = new BigNumber(0)
    let claimedStETH = new BigNumber(0)

    const unclaimedReqIds = await this.repo.getUnclaimedReqIds()
    if (E.isLeft(unclaimedReqIds)) {
      return [
        dbAlert(
          unclaimedReqIds.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:395`,
          `Could not call repo.getUnclaimedReqIds`,
        ),
      ]
    }
    const unclaimedRequestsStatuses = await this.ethProvider.getWithdrawalStatuses(
      unclaimedReqIds.right,
      blockDto.number,
    )
    if (E.isLeft(unclaimedRequestsStatuses)) {
      return [
        networkAlert(
          unclaimedRequestsStatuses.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:405`,
          `Could not call ethProvider.getWithdrawalStatuses`,
        ),
      ]
    }

    const updateErr = await this.repo.createOrUpdate(unclaimedRequestsStatuses.right)
    if (updateErr !== null) {
      return [
        networkAlert(
          updateErr,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:419`,
          `Could not call repo.createOrUpdate`,
        ),
      ]
    }

    const finalizedRequests = await this.repo.getFinalizedRequests()
    if (E.isLeft(finalizedRequests)) {
      return [
        dbAlert(
          finalizedRequests.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:430`,
          `Could not call repo.getFinalizedRequests`,
        ),
      ]
    }

    for (const request of finalizedRequests.right) {
      const isOutdated = currentBlockTimestamp - request.timestamp > TWO_WEEKS
      if (isOutdated && request.isClaimed) {
        outdatedClaimedReqIds.push(request.id)
      }
      if (!isOutdated && request.isClaimed) {
        claimedStETH = claimedStETH.plus(request.amountOfStETH)
      }
      if (!request.isClaimed) {
        unclaimedStETH = unclaimedStETH.plus(request.amountOfStETH)
      }
    }

    const removeErr = await this.repo.removeByIds(outdatedClaimedReqIds)
    if (removeErr !== null) {
      return [
        dbAlert(
          removeErr,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:454`,
          `Could not call repo.removeByIds`,
        ),
      ]
    }

    const totalFinalizedSize = claimedStETH.plus(unclaimedStETH)
    const unclaimedSizeRate = unclaimedStETH.div(totalFinalizedSize)
    if (currentBlockTimestamp - this.cache.getLastUnclaimedRequestsAlertTimestamp() > ONE_DAY) {
      if (unclaimedSizeRate.gte(THRESHOLD_02)) {
        const f: Finding = new Finding()
        f.setName(`ℹ️ Withdrawals: ${unclaimedSizeRate.times(100).toFixed(2)}% of finalized requests are unclaimed`)
        f.setDescription(
          `Unclaimed (for all time): ${unclaimedStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
            `Claimed (for 2 weeks): ${claimedStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
            `Total finalized: ${totalFinalizedSize.div(ETH_DECIMALS).toFixed(2)} stETH`,
        )
        f.setAlertid('WITHDRAWALS-UNCLAIMED-REQUESTS')
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        out.push(f)

        this.cache.setLastUnclaimedRequestsAlertTimestamp(currentBlockTimestamp)
      }
    }
    if (currentBlockTimestamp - this.cache.getLastUnclaimedMoreThanBalanceAlertTimestamp() > ONE_DAY) {
      const withdrawalQueueBalance = await this.ethProvider.getEthBalance(this.withdrawalsQueueAddress, blockDto.number)
      if (E.isLeft(withdrawalQueueBalance)) {
        return [
          networkAlert(
            withdrawalQueueBalance.left,
            `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:490`,
            `Could not call ethProvider.getBalance`,
          ),
        ]
      }

      if (unclaimedStETH.gt(withdrawalQueueBalance.right)) {
        const f: Finding = new Finding()
        f.setName(`🚨🚨🚨 Withdrawals: unclaimed requests size is more than withdrawal queue balance`)
        f.setDescription(
          `Unclaimed: ${unclaimedStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
            `Withdrawal queue balance: ${withdrawalQueueBalance.right.div(ETH_DECIMALS).toFixed(2)} ETH\n` +
            `Difference: ${unclaimedStETH.minus(withdrawalQueueBalance.right)} wei`,
        )
        f.setAlertid('WITHDRAWALS-UNCLAIMED-REQUESTS-MORE-THAN-BALANCE')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        out.push(f)

        this.cache.setLastUnclaimedMoreThanBalanceAlertTimestamp(currentBlockTimestamp)
      }
    }

    return out
  }

  public handleBunkerStatus(txEvent: TransactionDto): Finding[] {
    const [bunkerEnabled] = filterLog(txEvent.logs, WITHDRAWALS_BUNKER_MODE_ENABLED_EVENT, this.withdrawalsQueueAddress)
    const out: Finding[] = []

    if (bunkerEnabled) {
      this.cache.setIsBunkerMode(true)
      this.cache.setBunkerModeEnabledSinceTimestamp(bunkerEnabled.args._sinceTimestamp)

      const f: Finding = new Finding()
      f.setName('🚨 Withdrawals: BUNKER MODE ON! 🚨')
      f.setDescription(
        `Started from ${new Date(String(this.cache.getBunkerModeEnabledSinceTimestamp())).toUTCString()}`,
      )
      f.setAlertid('WITHDRAWALS-BUNKER-ENABLED')
      f.setSeverity(Finding.Severity.CRITICAL)
      f.setType(Finding.FindingType.DEGRADED)
      f.setProtocol('ethereum')

      out.push(f)

      return out
    }

    const [bunkerDisabled] = filterLog(
      txEvent.logs,
      WITHDRAWALS_BUNKER_MODE_DISABLED_EVENT,
      this.withdrawalsQueueAddress,
    )
    if (bunkerDisabled) {
      this.cache.setIsBunkerMode(false)
      const delay = formatDelay(txEvent.block.timestamp - Number(this.cache.getBunkerModeEnabledSinceTimestamp()))

      const f: Finding = new Finding()
      f.setName('⚠️ Withdrawals: BUNKER MODE OFF! ✅')
      f.setDescription(`Bunker lasted ${delay}`)
      f.setAlertid('WITHDRAWALS-BUNKER-DISABLED')
      f.setSeverity(Finding.Severity.MEDIUM)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      out.push(f)

      return out
    }

    return out
  }

  public async handleWithdrawalRequest(txEvent: TransactionDto): Promise<Finding[]> {
    const requestEvents = filterLog(
      txEvent.logs,
      WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED_EVENT,
      this.withdrawalsQueueAddress,
    )
    if (!requestEvents) {
      return []
    }

    const perRequesterAmounts = new Map<string, BigNumber>()
    const withdrawalRequestIds: number[] = []
    for (const event of requestEvents) {
      perRequesterAmounts.set(
        event.args.requestor,
        (perRequesterAmounts.get(event.args.requestor) || new BigNumber(0)).plus(
          new BigNumber(String(event.args.amountOfStETH)).div(ETH_DECIMALS),
        ),
      )

      withdrawalRequestIds.push(Number(event.args.requestId))
    }

    const withdrawalRequests = await this.ethProvider.getWithdrawalStatuses(withdrawalRequestIds, txEvent.block.number)
    if (E.isLeft(withdrawalRequests)) {
      return [
        networkAlert(
          withdrawalRequests.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:593`,
          `Could not call ethProvider.getWithdrawalStatuses`,
        ),
      ]
    }

    const updateErr = await this.repo.createOrUpdate(withdrawalRequests.right)
    if (updateErr !== null) {
      return [
        dbAlert(
          updateErr,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:604`,
          `Could not call repo.createOrUpdate`,
        ),
      ]
    }

    const out: Finding[] = []
    for (const [requester, amounts] of perRequesterAmounts.entries()) {
      if (amounts.gte(THRESHOLD_OF_5K_STETH)) {
        const f: Finding = new Finding()
        f.setName(`ℹ️ Huge stETH withdrawal requests batch`)
        f.setDescription(`Requester: ${etherscanAddress(requester)}\n` + `Amount: ${amounts.toFixed(2)} stETH`)
        f.setAlertid('WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-BATCH')
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }

      this.cache.setAmountOfRequestedStETHSinceLastTokenRebase(
        this.cache.getAmountOfRequestedStETHSinceLastTokenRebase().plus(amounts),
      )
    }

    if (this.cache.getAmountOfRequestedStETHSinceLastTokenRebase().gte(THRESHOLD_OF_150K_STETH)) {
      if (this.cache.getLastBigRequestAfterRebaseAlertTimestamp() < this.cache.getLastTokenRebaseTimestamp()) {
        const f: Finding = new Finding()
        f.setName(
          `⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than ${THRESHOLD_OF_150K_STETH} stETH (max staking limit)`,
        )
        f.setDescription(`Amount: ${this.cache.getAmountOfRequestedStETHSinceLastTokenRebase().toFixed(2)} stETH`)
        f.setAlertid('WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-AFTER-REBASE')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)

        this.cache.setLastBigRequestAfterRebaseAlertTimestamp(txEvent.block.timestamp)
      }
    }

    return out
  }

  public handleLastTokenRebase(txEvent: TransactionDto): void {
    const [rebaseEvent] = filterLog(txEvent.logs, LIDO_TOKEN_REBASED_EVENT, this.lidoStethAddress)
    if (!rebaseEvent) {
      return
    }

    this.cache.setLastTokenRebaseTimestamp(txEvent.block.timestamp)
    this.cache.setAmountOfRequestedStETHSinceLastTokenRebase(new BigNumber(0))
  }

  public async handleWithdrawalFinalized(txEvent: TransactionDto): Promise<Finding[]> {
    const [withdrawalEvent] = filterLog(
      txEvent.logs,
      WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
      this.withdrawalsQueueAddress,
    )
    if (!withdrawalEvent) {
      return []
    }

    const finalizedIds: number[] = []
    for (let i = Number(withdrawalEvent.args.from); i <= Number(withdrawalEvent.args.to); i++) {
      finalizedIds.push(i)
    }

    const finalizedStatuses = await this.ethProvider.getWithdrawalStatuses(finalizedIds, txEvent.block.number)
    if (E.isLeft(finalizedStatuses)) {
      return [
        networkAlert(
          finalizedStatuses.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:679`,
          `Could not call ethProvider.getWithdrawalStatuses`,
        ),
      ]
    }

    const updErr = await this.repo.createOrUpdate(finalizedStatuses.right)
    if (updErr !== null) {
      return [
        dbAlert(
          updErr,
          `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:690`,
          `Could not call repo.createOrUpdate`,
        ),
      ]
    }

    return []
  }

  public async handleWithdrawalClaimed(txEvent: TransactionDto): Promise<Finding[]> {
    const claimedEvents = filterLog(
      txEvent.logs,
      WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT,
      this.withdrawalsQueueAddress,
    )
    if (claimedEvents.length === 0) {
      return []
    }

    const currentBlockTimestamp = txEvent.block.timestamp
    if (currentBlockTimestamp - this.cache.getLastClaimedAmountMoreThanRequestedAlertTimestamp() > ONE_HOUR) {
      this.cache.setClaimedAmountMoreThanRequestedAlertsCount(0)
    }

    if (this.cache.getClaimedAmountMoreThanRequestedAlertsCount() >= CLAIMED_MORE_THEN_REQUESTED_5_ATTEMPT_PER_HOUR) {
      return []
    }

    const out: Finding[] = []
    const claimedRequestIds: number[] = []
    for (const event of claimedEvents) {
      claimedRequestIds.push(Number(event.args.requestId))
    }

    const claimedRequestMap = await this.repo.getRequestMapByIds(claimedRequestIds)
    if (E.isLeft(claimedRequestMap)) {
      return [
        dbAlert(
          claimedRequestMap.left,
          `Error in ${WithdrawalsSrv.name}.${this.handleWithdrawalClaimed.name}:732`,
          `Could not call repo.getRequestMapByIds`,
        ),
      ]
    }

    for (const event of claimedEvents) {
      const reqId = Number(event.args.requestId)
      if (claimedRequestMap.right.has(reqId)) {
        const withdrawalRequest = claimedRequestMap.right.get(reqId) as WithdrawalRequest
        const claimedAmount = new BigNumber(String(event.args.amountOfETH))

        if (claimedAmount.gt(withdrawalRequest.amountOfStETH)) {
          const f: Finding = new Finding()
          f.setName(`🚨🚨🚨 Withdrawals: claimed amount is more than requested`)
          f.setDescription(
            `Request ID: ${etherscanNft(this.withdrawalsQueueAddress, reqId)}\n` +
              `Claimed: ${claimedAmount.div(ETH_DECIMALS).toFixed(2)} ETH\n` +
              `Requested: ${withdrawalRequest.amountOfStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
              `Difference: ${claimedAmount.minus(withdrawalRequest.amountOfStETH)} wei\n` +
              `Owner: ${etherscanAddress(event.args.owner)}\n` +
              `Receiver: ${etherscanAddress(event.args.receiver)}`,
          )
          f.setAlertid('WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED')
          f.setSeverity(Finding.Severity.CRITICAL)
          f.setType(Finding.FindingType.INFORMATION)
          f.setProtocol('ethereum')

          out.push(f)

          this.cache.setClaimedAmountMoreThanRequestedAlertsCount(
            this.cache.getClaimedAmountMoreThanRequestedAlertsCount() + 1,
          )

          this.cache.setLastClaimedAmountMoreThanRequestedAlertTimestamp(currentBlockTimestamp)
        }

        withdrawalRequest.isClaimed = true
        withdrawalRequest.amountOfStETH = new BigNumber(String(event.args.amountOfETH))

        const updateErr = await this.repo.setWithdrawalRequestClaimed(
          withdrawalRequest.id,
          withdrawalRequest.isClaimed,
          withdrawalRequest.amountOfStETH.toString(),
        )

        if (updateErr !== null) {
          out.push(
            dbAlert(
              updateErr,
              `Error in ${WithdrawalsSrv.name}.${this.repo.setWithdrawalRequestClaimed.name}:823`,
              `Could not call repo.setWithdrawalRequestClaimed`,
            ),
          )
        }
      }
    }

    return out
  }

  async getStatistic(): Promise<E.Either<Error, string>> {
    const data = await this.repo.getAll()
    if (E.isLeft(data)) {
      return data
    }

    let stETH = new BigNumber(0)

    let finalizedStETH = new BigNumber(0)
    let nonFinalizedStETH = new BigNumber(0)

    let claimedStEth = new BigNumber(0)
    let nonClaimedStEth = new BigNumber(0)

    let finalized: number = 0
    let claimed: number = 0
    let notFinalized: number = 0
    let notClaimed: number = 0

    for (const wr of data.right) {
      stETH = stETH.plus(wr.amountOfStETH)

      if (wr.isFinalized) {
        finalized += 1
        finalizedStETH = finalizedStETH.plus(wr.amountOfStETH)
      } else {
        notFinalized += 1
        nonFinalizedStETH = nonFinalizedStETH.plus(wr.amountOfStETH)
      }

      if (wr.isClaimed) {
        claimed += 1
        claimedStEth = claimedStEth.plus(wr.amountOfStETH)
      } else {
        notClaimed += 1
        nonClaimedStEth = nonClaimedStEth.plus(wr.amountOfStETH)
      }
    }

    return E.right(
      `\n` +
        `\tStEth:         ${stETH.dividedBy(ETH_DECIMALS).toFixed(4)} \n` +
        `\tfinalized:     ${finalizedStETH.dividedBy(ETH_DECIMALS).toFixed(4)} ${finalized} \n` +
        `\tnot finalized: ${nonFinalizedStETH.dividedBy(ETH_DECIMALS).toFixed(4)}  ${notFinalized}  \n` +
        `\tclaimed:       ${claimedStEth.dividedBy(ETH_DECIMALS).toFixed(4)} ${claimed} \n` +
        `\tnot claimed:   ${nonClaimedStEth.dividedBy(ETH_DECIMALS).toFixed(4)}  ${notClaimed}\n` +
        `\ttotal:         ${data.right.length} wr`,
    )
  }
}
