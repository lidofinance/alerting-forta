import BigNumber from 'bignumber.js'
import { WithdrawalsCache } from './Withdrawals.cache'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../../utils/constants'
import { elapsedTime, formatDelay } from '../../utils/time'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import {
  LIDO_TOKEN_REBASED_EVENT,
  WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT,
  WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED_EVENT,
  WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
  WITHDRAWALS_BUNKER_MODE_DISABLED_EVENT,
  WITHDRAWALS_BUNKER_MODE_ENABLED_EVENT,
} from '../../utils/events/withdrawals_events'
import { etherscanAddress, etherscanNft } from '../../utils/string'
import { EventOfNotice, BlockDto } from '../../entity/events'
import { Logger } from 'winston'
import { WithdrawalRequest } from '../../entity/withdrawal_request'
import { WithdrawalsRepo } from './Withdrawals.repo'
import { dbAlert, networkAlert } from '../../utils/errors'
import { IWithdrawalsClient } from './contract'
import { formatAddress } from 'forta-agent/dist/cli/utils'

const ONE_HOUR = 60 * 60
const ONE_DAY = ONE_HOUR * 24

const BLOCK_CHECK_INTERVAL = 100 // ~20 minutes
const QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY = ONE_DAY
const QUEUE_ON_PAR_STAKE_LIMIT_RATE_THRESHOLD = 0.95
const BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_DAY

const LONG_UNFINALIZED_QUEUE_THRESHOLD = 5 * ONE_DAY // 5 days
const LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_DAY
const UNCLAIMED_REQUESTS_TIME_WINDOW = 14 * ONE_DAY // 2 weeks
const UNCLAIMED_REQUESTS_SIZE_RATE_TRIGGER_EVERY = ONE_DAY
const UNCLAIMED_REQUESTS_SIZE_RATE_THRESHOLD = 0.2
const UNCLAIMED_REQUESTS_MORE_THAN_BALANCE_TRIGGER_EVERY = ONE_DAY

const BIG_UNFINALIZED_QUEUE_THRESHOLD = new BigNumber(100_000)
const BIG_WITHDRAWAL_REQUEST_THRESHOLD = new BigNumber(5_000)
const BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD = new BigNumber(150_000)

const CLAIMED_AMOUNT_MORE_THAN_REQUESTED_MAX_ALERTS_PER_HOUR = 5

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
    const lastRequestId = await this.ethProvider.getWithdrawalLastRequestId(currentBlock)
    if (E.isLeft(lastRequestId)) {
      return lastRequestId.left
    }

    const requests: number[] = []
    for (let i = 1; i <= lastRequestId.right; i++) {
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

    if (blockDto.number % BLOCK_CHECK_INTERVAL === 0) {
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

  public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
    const out: Finding[] = []

    const bunkerStatusFindings = this.handleBunkerStatus(txEvent)
    this.handleLastTokenRebase(txEvent)

    const finalizedFindings = await this.handleWithdrawalFinalized(txEvent)
    const withdrawalRequestFindings = await this.handleWithdrawalRequest(txEvent)
    const withdrawalClaimedFindings = await this.handleWithdrawalClaimed(txEvent)
    const withdrawalsEventsFindings = this.handleEventsOfNotice(txEvent, this.withdrawalsEvents)

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

    if (
      blockTimestamp - this.cache.getLastQueueOnParStakeLimitAlertTimestamp() <=
      QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY
    ) {
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
    const thresholdStakeLimit = stakeLimitFullInfo.right.maxStakeLimit.times(QUEUE_ON_PAR_STAKE_LIMIT_RATE_THRESHOLD)

    const findings: Finding[] = []
    if (spentStakeLimit.gte(thresholdStakeLimit) && unfinalizedStETH.right.gte(thresholdStakeLimit)) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ Withdrawals: ${spentStakeLimitRate.times(
            100,
          )}% of stake limit is drained and unfinalized queue is on par with drained stake limit`,
          description:
            `Unfinalized queue: ${unfinalizedStETH.right.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
            `Spent stake limit: ${spentStakeLimit.div(ETH_DECIMALS).toFixed(2)} stETH`,
          alertId: 'WITHDRAWALS-UNFINALIZED-QUEUE-AND-STAKE-LIMIT',
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        }),
      )
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
      if (
        currentBlockTimestamp - this.cache.getLastBigUnfinalizedQueueAlertTimestamp() >
        BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY
      ) {
        if (unfinalizedStETH.gte(BIG_UNFINALIZED_QUEUE_THRESHOLD)) {
          // if alert hasn't been sent after last finalized batch
          // and unfinalized queue is more than `BIG_UNFINALIZED_QUEUE_THRESHOLD` StETH
          out.push(
            Finding.fromObject({
              name: `⚠️ Withdrawals: unfinalized queue is more than ${BIG_UNFINALIZED_QUEUE_THRESHOLD} stETH`,
              description: `Unfinalized queue is ${unfinalizedStETH.toFixed(2)} stETH`,
              alertId: 'WITHDRAWALS-BIG-UNFINALIZED-QUEUE',
              severity: FindingSeverity.Medium,
              type: FindingType.Info,
            }),
          )

          this.cache.setLastBigUnfinalizedQueueAlertTimestamp(currentBlockTimestamp)
        }
      }
    }

    if (!this.cache.getIsBunkerMode() && unfinalizedStETH.gt(0)) {
      if (currentBlockTimestamp - LONG_UNFINALIZED_QUEUE_THRESHOLD > firstUnfinalizedRequest.right.timestamp) {
        const waitTime = currentBlockTimestamp - this.cache.getLastLongUnfinalizedQueueAlertTimestamp()

        if (waitTime > LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY) {
          // if we are in turbo mode and unfinalized queue is not finalized for 5 days
          // and alert hasn't been sent for 1 day
          out.push(
            Finding.fromObject({
              name: `⚠️ Withdrawals: unfinalized queue wait time is ${new Date(waitTime * 1000).getHours()} hr`,
              description: `Unfinalized queue wait time is ${formatDelay(
                currentBlockTimestamp - firstUnfinalizedRequest.right.timestamp,
              )}`,
              alertId: 'WITHDRAWALS-LONG-UNFINALIZED-QUEUE',
              severity: FindingSeverity.Medium,
              type: FindingType.Info,
            }),
          )

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
      const isOutdated = currentBlockTimestamp - request.timestamp > UNCLAIMED_REQUESTS_TIME_WINDOW
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
    if (
      currentBlockTimestamp - this.cache.getLastUnclaimedRequestsAlertTimestamp() >
      UNCLAIMED_REQUESTS_SIZE_RATE_TRIGGER_EVERY
    ) {
      if (unclaimedSizeRate.gte(UNCLAIMED_REQUESTS_SIZE_RATE_THRESHOLD)) {
        out.push(
          Finding.fromObject({
            name: `ℹ️ Withdrawals: ${unclaimedSizeRate.times(100).toFixed(2)}% of finalized requests are unclaimed`,
            description:
              `Unclaimed (for all time): ${unclaimedStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
              `Claimed (for 2 weeks): ${claimedStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
              `Total finalized: ${totalFinalizedSize.div(ETH_DECIMALS).toFixed(2)} stETH`,
            alertId: 'WITHDRAWALS-UNCLAIMED-REQUESTS',
            severity: FindingSeverity.Info,
            type: FindingType.Suspicious,
          }),
        )
        this.cache.setLastUnclaimedRequestsAlertTimestamp(currentBlockTimestamp)
      }
    }
    if (
      currentBlockTimestamp - this.cache.getLastUnclaimedMoreThanBalanceAlertTimestamp() >
      UNCLAIMED_REQUESTS_MORE_THAN_BALANCE_TRIGGER_EVERY
    ) {
      const withdrawalQueueBalance = await this.ethProvider.getBalance(this.withdrawalsQueueAddress, blockDto.number)
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
        out.push(
          Finding.fromObject({
            name: `🚨🚨🚨 Withdrawals: unclaimed requests size is more than withdrawal queue balance`,
            description:
              `Unclaimed: ${unclaimedStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
              `Withdrawal queue balance: ${withdrawalQueueBalance.right.div(ETH_DECIMALS).toFixed(2)} ETH\n` +
              `Difference: ${unclaimedStETH.minus(withdrawalQueueBalance.right)} wei`,
            alertId: 'WITHDRAWALS-UNCLAIMED-REQUESTS-MORE-THAN-BALANCE',
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        )
        this.cache.setLastUnclaimedMoreThanBalanceAlertTimestamp(currentBlockTimestamp)
      }
    }

    return out
  }

  public handleBunkerStatus(txEvent: TransactionEvent): Finding[] {
    const [bunkerEnabled] = filterLog(txEvent.logs, WITHDRAWALS_BUNKER_MODE_ENABLED_EVENT, this.withdrawalsQueueAddress)

    const out: Finding[] = []

    if (bunkerEnabled) {
      this.cache.setIsBunkerMode(true)
      this.cache.setBunkerModeEnabledSinceTimestamp(bunkerEnabled.args._sinceTimestamp)

      out.push(
        Finding.fromObject({
          name: '🚨 Withdrawals: BUNKER MODE ON! 🚨',
          description: `Started from ${new Date(
            String(this.cache.getBunkerModeEnabledSinceTimestamp()),
          ).toUTCString()}`,
          alertId: 'WITHDRAWALS-BUNKER-ENABLED',
          severity: FindingSeverity.Critical,
          type: FindingType.Degraded,
        }),
      )

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
      out.push(
        Finding.fromObject({
          name: '⚠️ Withdrawals: BUNKER MODE OFF! ✅',
          description: `Bunker lasted ${delay}`,
          alertId: 'WITHDRAWALS-BUNKER-DISABLED',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      )
      return out
    }

    return out
  }

  public async handleWithdrawalRequest(txEvent: TransactionEvent): Promise<Finding[]> {
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
      if (amounts.gte(BIG_WITHDRAWAL_REQUEST_THRESHOLD)) {
        out.push(
          Finding.fromObject({
            name: `ℹ️ Huge stETH withdrawal requests batch`,
            description: `Requester: ${etherscanAddress(requester)}\n` + `Amount: ${amounts.toFixed(2)} stETH`,
            alertId: 'WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-BATCH',
            severity: FindingSeverity.Info,
            type: FindingType.Info,
          }),
        )
      }

      this.cache.setAmountOfRequestedStETHSinceLastTokenRebase(
        this.cache.getAmountOfRequestedStETHSinceLastTokenRebase().plus(amounts),
      )
    }

    if (this.cache.getAmountOfRequestedStETHSinceLastTokenRebase().gte(BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD)) {
      if (this.cache.getLastBigRequestAfterRebaseAlertTimestamp() < this.cache.getLastTokenRebaseTimestamp()) {
        out.push(
          Finding.fromObject({
            name: `⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than ${BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD} stETH (max staking limit)`,
            description: `Amount: ${this.cache.getAmountOfRequestedStETHSinceLastTokenRebase().toFixed(2)} stETH`,
            alertId: 'WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-AFTER-REBASE',
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          }),
        )

        this.cache.setLastBigRequestAfterRebaseAlertTimestamp(txEvent.timestamp)
      }
    }

    return out
  }

  public handleLastTokenRebase(txEvent: TransactionEvent): void {
    const [rebaseEvent] = filterLog(txEvent.logs, LIDO_TOKEN_REBASED_EVENT, this.lidoStethAddress)
    if (!rebaseEvent) {
      return
    }

    this.cache.setLastTokenRebaseTimestamp(txEvent.timestamp)
    this.cache.setAmountOfRequestedStETHSinceLastTokenRebase(new BigNumber(0))
  }

  public async handleWithdrawalFinalized(txEvent: TransactionEvent): Promise<Finding[]> {
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

  public async handleWithdrawalClaimed(txEvent: TransactionEvent): Promise<Finding[]> {
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

    if (
      this.cache.getClaimedAmountMoreThanRequestedAlertsCount() >=
      CLAIMED_AMOUNT_MORE_THAN_REQUESTED_MAX_ALERTS_PER_HOUR
    ) {
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
          out.push(
            Finding.fromObject({
              name: `🚨🚨🚨 Withdrawals: claimed amount is more than requested`,
              description:
                `Request ID: ${etherscanNft(this.withdrawalsQueueAddress, reqId)}\n` +
                `Claimed: ${claimedAmount.div(ETH_DECIMALS).toFixed(2)} ETH\n` +
                `Requested: ${withdrawalRequest.amountOfStETH.div(ETH_DECIMALS).toFixed(2)} stETH\n` +
                `Difference: ${claimedAmount.minus(withdrawalRequest.amountOfStETH)} wei\n` +
                `Owner: ${etherscanAddress(event.args.owner)}\n` +
                `Receiver: ${etherscanAddress(event.args.receiver)}`,
              alertId: 'WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED',
              severity: FindingSeverity.Critical,
              type: FindingType.Suspicious,
            }),
          )

          this.cache.setClaimedAmountMoreThanRequestedAlertsCount(
            this.cache.getClaimedAmountMoreThanRequestedAlertsCount() + 1,
          )

          this.cache.setLastClaimedAmountMoreThanRequestedAlertTimestamp(currentBlockTimestamp)
        }

        withdrawalRequest.isClaimed = true
        withdrawalRequest.amountOfStETH = new BigNumber(String(event.args.amountOfETH))
      }
    }

    return out
  }

  public handleEventsOfNotice(txEvent: TransactionEvent, eventsOfNotice: EventOfNotice[]): Finding[] {
    const out: Finding[] = []
    for (const eventInfo of eventsOfNotice) {
      if (formatAddress(eventInfo.address) in txEvent.addresses) {
        const filteredEvents = filterLog(txEvent.logs, eventInfo.event, eventInfo.address)

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
}
