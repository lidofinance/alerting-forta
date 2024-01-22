import { Lido as LidoContract, WithdrawalQueueERC721 as WithdrawalQueueContract } from '../../generated'
import BigNumber from 'bignumber.js'
import { retryAsync } from 'ts-retry'
import { WithdrawalRequest, WithdrawalsCache } from './Withdrawals.cache'
import { BlockEvent, filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { IETHProvider } from '../../clients/eth_provider'
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
import { EventOfNotice } from '../../entity/events'

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

  private readonly lidoContract: LidoContract
  private readonly wdQueueContract: WithdrawalQueueContract
  private readonly cache: WithdrawalsCache
  private readonly ethProvider: IETHProvider
  private readonly withdrawalsEvents: EventOfNotice[]

  constructor(
    ethProvider: IETHProvider,
    wdQueueContract: WithdrawalQueueContract,
    lidoContract: LidoContract,
    cache: WithdrawalsCache,
    withdrawalsEvents: EventOfNotice[],
  ) {
    this.ethProvider = ethProvider
    this.wdQueueContract = wdQueueContract
    this.lidoContract = lidoContract
    this.cache = cache
    this.withdrawalsEvents = withdrawalsEvents
  }

  async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    try {
      const isBunkerMode = await retryAsync<boolean>(
        async (): Promise<boolean> => {
          const [isBunkerMode] = await this.wdQueueContract.functions.isBunkerModeActive({
            blockTag: currentBlock,
          })

          return isBunkerMode
        },
        { delay: 500, maxTry: 5 },
      )

      this.cache.setIsBunkerMode(isBunkerMode)
    } catch (e) {
      console.log(elapsedTime(`[${this.name}.initialize]`, start))
      return new Error(`Could not call "isBunkerModeActive. Cause ${e}`)
    }

    if (this.cache.getIsBunkerMode()) {
      let bunkerModeSinceTimestamp: number
      try {
        bunkerModeSinceTimestamp = await retryAsync<number>(
          async (): Promise<number> => {
            const [resp] = await this.wdQueueContract.functions.bunkerModeSinceTimestamp({
              blockTag: currentBlock,
            })

            return Number(resp)
          },
          { delay: 500, maxTry: 5 },
        )

        this.cache.setBunkerModeEnabledSinceTimestamp(bunkerModeSinceTimestamp)
      } catch (e) {
        console.log(elapsedTime(`[${this.name}.initialize]`, start))
        return new Error(`Could not call "bunkerModeSinceTimestamp. Cause ${e}`)
      }
    }

    let lastRequestId: number
    try {
      lastRequestId = await retryAsync<number>(
        async (): Promise<number> => {
          const [resp] = await this.wdQueueContract.functions.getLastRequestId({
            blockTag: currentBlock,
          })

          return Number(resp)
        },
        { delay: 500, maxTry: 5 },
      )
    } catch (e) {
      console.log(elapsedTime(`[${this.name}.initialize]`, start))
      return new Error(`Could not call "getLastRequestId. Cause ${e}`)
    }

    if (lastRequestId !== 0) {
      try {
        const lastFinalizedRequestId = await retryAsync<number>(
          async (): Promise<number> => {
            const [resp] = await this.wdQueueContract.functions.getLastFinalizedRequestId({
              blockTag: currentBlock,
            })

            return Number(resp)
          },
          { delay: 500, maxTry: 5 },
        )

        this.cache.setLastFinalizedRequestId(lastFinalizedRequestId)
      } catch (e) {
        console.log(elapsedTime(`[${this.name}.initialize]`, start))
        return new Error(`Could not call "getLastFinalizedRequestId. Cause ${e}`)
      }

      if (this.cache.getLastFinalizedRequestId() !== 0) {
        try {
          const lastFinalizedTimestamp = await retryAsync<number>(
            async (): Promise<number> => {
              const resp = await this.wdQueueContract.functions.getWithdrawalStatus(
                [this.cache.getLastFinalizedRequestId()],
                {
                  blockTag: currentBlock,
                },
              )

              return Number(resp.statuses[0].timestamp)
            },
            { delay: 500, maxTry: 5 },
          )

          this.cache.setLastFinalizedTimestamp(lastFinalizedTimestamp)
        } catch (e) {
          console.log(elapsedTime(`[${this.name}.initialize]`, start))

          return new Error(`Could not call "getWithdrawalStatus. Cause ${e}`)
        }
      }

      const diff = lastRequestId - this.cache.getLastFinalizedRequestId()
      let endValue = this.cache.getLastFinalizedRequestId()
      if (diff > 0) {
        endValue += 1
      }

      const requestsRange: number[] = []
      for (let i = 1; i <= endValue; i++) {
        requestsRange.push(i)
      }

      const requestsStatuses = await this.ethProvider.getWithdrawalStatuses(requestsRange, currentBlock)
      if (E.isLeft(requestsStatuses)) {
        console.log(elapsedTime(`[${this.name}.initialize]`, start))

        return requestsStatuses.left
      }

      for (const [index, reqStatus] of requestsStatuses.right.entries()) {
        const reqId = index + 1
        if (reqStatus.isFinalized) {
          this.cache.getFinalizedWithdrawalRequestsMap().set(reqId, {
            id: reqId,
            amount: new BigNumber(String(reqStatus.amountOfStETH)),
            claimed: reqStatus.isClaimed,
            timestamp: String(reqStatus.timestamp),
          })
        }
      }
      if (diff > 0) {
        this.cache.setFirstUnfinalizedRequestTimestamp(
          requestsStatuses.right[requestsRange.length - 1].timestamp.toNumber(),
        )
      }
    }

    console.log(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    if (blockEvent.block.number % BLOCK_CHECK_INTERVAL == 0) {
      const [queueOnParWithStakeLimitFindings, unfinalizedRequestNumberFindings, unclaimedRequestsFindings] =
        await Promise.all([
          this.handleQueueOnParWithStakeLimit(blockEvent),
          this.handleUnfinalizedRequestNumber(blockEvent),
          this.handleUnclaimedRequests(blockEvent),
        ])

      findings.push(
        ...queueOnParWithStakeLimitFindings,
        ...unfinalizedRequestNumberFindings,
        ...unclaimedRequestsFindings,
      )
    }

    console.log(elapsedTime(WithdrawalsSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public handleTransaction(txEvent: TransactionEvent): Finding[] {
    const out: Finding[] = []

    const bunkerStatusFindings = this.handleBunkerStatus(txEvent)
    this.handleLastTokenRebase(txEvent)
    this.handleWithdrawalFinalized(txEvent)
    const withdrawalRequestFindings = this.handleWithdrawalRequest(txEvent)
    const withdrawalClaimedFindings = this.handleWithdrawalClaimed(txEvent)
    const withdrawalsEventsFindings = this.handleEventsOfNotice(txEvent, this.withdrawalsEvents)

    out.push(
      ...bunkerStatusFindings,
      ...withdrawalRequestFindings,
      ...withdrawalClaimedFindings,
      ...withdrawalsEventsFindings,
    )

    return out
  }

  public async handleQueueOnParWithStakeLimit(blockEvent: BlockEvent): Promise<Finding[]> {
    const blockTimestamp = blockEvent.block.timestamp

    if (
      blockTimestamp - this.cache.getLastQueueOnParStakeLimitAlertTimestamp() <=
      QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY
    ) {
      return []
    }

    const stakeLimitFullInfo = await this.ethProvider.getStakingLimitInfo(blockEvent.blockNumber)
    if (E.isLeft(stakeLimitFullInfo)) {
      const f: Finding = Finding.fromObject({
        name: `Error in ${WithdrawalsSrv.name}.${this.handleQueueOnParWithStakeLimit.name}:213`,
        description: `Could not call "ethProvider.getStakingLimitInfo. Cause ${stakeLimitFullInfo.left.message}`,
        alertId: 'LIDO-AGENT-ERROR',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
        metadata: { stack: `${stakeLimitFullInfo.left.stack}` },
      })

      return [f]
    }

    const unfinalizedStETH = await this.ethProvider.getUnfinalizedStETH(blockEvent.blockNumber)
    if (E.isLeft(unfinalizedStETH)) {
      const f: Finding = Finding.fromObject({
        name: `Error in ${WithdrawalsSrv.name}.${this.handleQueueOnParWithStakeLimit.name}:232`,
        description: `Could not call "wdQueueContract.unfinalizedStETH. Cause ${unfinalizedStETH.left.message}`,
        alertId: 'LIDO-AGENT-ERROR',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
        metadata: { stack: `${unfinalizedStETH.left.stack}` },
      })

      return [f]
    }

    if (stakeLimitFullInfo.right.isStakingPaused || unfinalizedStETH.right.eq(0)) {
      return []
    }
    const drainedStakeLimit = stakeLimitFullInfo.right.maxStakeLimit.minus(stakeLimitFullInfo.right.currentStakeLimit)
    const drainedStakeLimitRate = drainedStakeLimit.div(stakeLimitFullInfo.right.maxStakeLimit)
    const thresholdStakeLimit = stakeLimitFullInfo.right.maxStakeLimit.times(QUEUE_ON_PAR_STAKE_LIMIT_RATE_THRESHOLD)

    const findings: Finding[] = []
    if (drainedStakeLimit.gte(thresholdStakeLimit) && unfinalizedStETH.right.gte(thresholdStakeLimit)) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ Withdrawals: ${drainedStakeLimitRate.times(
            100,
          )}% of stake limit is drained and unfinalized queue is on par with drained stake limit`,
          description: `Unfinalized queue: ${unfinalizedStETH.right
            .div(ETH_DECIMALS)
            .toFixed(2)} stETH\nDrained stake limit: ${drainedStakeLimit.div(ETH_DECIMALS).toFixed(2)} stETH`,
          alertId: 'WITHDRAWALS-UNFINALIZED-QUEUE-AND-STAKE-LIMIT',
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        }),
      )
      this.cache.setLastQueueOnParStakeLimitAlertTimestamp(blockTimestamp)
    }

    return findings
  }

  public async handleUnfinalizedRequestNumber(blockEvent: BlockEvent): Promise<Finding[]> {
    const currentBlockTimestamp = blockEvent.block.timestamp

    let unfinalizedStETH = new BigNumber(0)

    const out: Finding[] = []
    if (currentBlockTimestamp >= this.cache.getLastFinalizedTimestamp()) {
      const unfinalizedStETHraw = await this.ethProvider.getUnfinalizedStETH(blockEvent.blockNumber)
      if (E.isLeft(unfinalizedStETHraw)) {
        const f: Finding = Finding.fromObject({
          name: `Error in ${WithdrawalsSrv.name}.${this.handleUnfinalizedRequestNumber.name}:292`,
          description: `Could not call "wdQueueContract.unfinalizedStETH. Cause ${unfinalizedStETHraw.left.message}`,
          alertId: 'LIDO-AGENT-ERROR',
          severity: FindingSeverity.Low,
          type: FindingType.Degraded,
          metadata: { stack: `${unfinalizedStETHraw.left.stack}` },
        })

        return [f]
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
      if (currentBlockTimestamp - LONG_UNFINALIZED_QUEUE_THRESHOLD > this.cache.getFirstUnfinalizedRequestTimestamp()) {
        if (
          currentBlockTimestamp - this.cache.getLastLongUnfinalizedQueueAlertTimestamp() >
          LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY
        ) {
          // if we are in turbo mode and unfinalized queue is not finalized for 5 days
          // and alert hasn't been sent for 1 day
          out.push(
            Finding.fromObject({
              name: '⚠️ Withdrawals: unfinalized queue wait time is too long',
              description: `Unfinalized queue wait time is ${formatDelay(
                currentBlockTimestamp - this.cache.getFirstUnfinalizedRequestTimestamp(),
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

  public async handleUnclaimedRequests(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []
    const currentBlockTimestamp = blockEvent.block.timestamp

    const outdatedClaimedReqIds: number[] = []
    let unclaimedStETH = new BigNumber(0)
    let claimedStETH = new BigNumber(0)

    const unclaimedReqIds: number[] = []
    for (const [id, req] of this.cache.getFinalizedWithdrawalRequestsMap().entries()) {
      if (!req.claimed) {
        unclaimedReqIds.push(id)
      }
    }
    if (unclaimedReqIds.length == 0) {
      return []
    }
    const unclaimedRequestsStatuses = await this.ethProvider.getWithdrawalStatuses(
      unclaimedReqIds,
      blockEvent.blockNumber,
    )
    if (E.isLeft(unclaimedRequestsStatuses)) {
      const f: Finding = Finding.fromObject({
        name: `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:363`,
        description: `Could not call "wdQueueContract.getWithdrawalStatuses. Cause ${unclaimedRequestsStatuses.left.message}`,
        alertId: 'LIDO-AGENT-ERROR',
        severity: FindingSeverity.Low,
        type: FindingType.Degraded,
        metadata: { stack: `${unclaimedRequestsStatuses.left.stack}` },
      })

      return [f]
    }

    for (const [index, reqStatus] of unclaimedRequestsStatuses.right.entries()) {
      const reqId = unclaimedReqIds[index]
      const curr = this.cache.getFinalizedWithdrawalRequestsMap().get(reqId)
      if (curr === undefined) {
        const f: Finding = Finding.fromObject({
          name: `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:377`,
          description: `FinalizedWithdrawalRequestsMap is broken. FinalizedWithdrawalRequestsMap(${reqId}) does not contain value.`,
          alertId: 'LIDO-AGENT-ERROR',
          severity: FindingSeverity.High,
          type: FindingType.Unknown,
        })

        return [f]
      }

      const withdrawalRequest: WithdrawalRequest = {
        id: curr.id,
        amount: new BigNumber(String(reqStatus.amountOfStETH)),
        claimed: reqStatus.isClaimed,
        timestamp: curr.timestamp,
      }

      this.cache.getFinalizedWithdrawalRequestsMap().set(reqId, withdrawalRequest)
    }

    for (const [id, req] of this.cache.getFinalizedWithdrawalRequestsMap()) {
      const isOutdated = currentBlockTimestamp - Number(req.timestamp) > UNCLAIMED_REQUESTS_TIME_WINDOW
      if (isOutdated) {
        if (req.claimed) {
          outdatedClaimedReqIds.push(id)
        }
      }
      if (!isOutdated && req.claimed) {
        claimedStETH = claimedStETH.plus(req.amount as BigNumber)
      }
      if (!req.claimed) {
        unclaimedStETH = unclaimedStETH.plus(req.amount as BigNumber)
      }
    }

    for (const id of outdatedClaimedReqIds) {
      this.cache.getFinalizedWithdrawalRequestsMap().delete(id)
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
            name: `🤔 Withdrawals: ${unclaimedSizeRate.times(100).toFixed(2)}% of finalized requests are unclaimed`,
            description: `Unclaimed (for all time): ${unclaimedStETH
              .div(ETH_DECIMALS)
              .toFixed(2)} stETH\nClaimed (for 2 weeks): ${claimedStETH
              .div(ETH_DECIMALS)
              .toFixed(2)} stETH\nTotal finalized: ${totalFinalizedSize.div(ETH_DECIMALS).toFixed(2)} stETH`,
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
      const withdrawalQueueBalance = await this.ethProvider.getBalance(
        this.wdQueueContract.address,
        blockEvent.block.number,
      )
      if (E.isLeft(withdrawalQueueBalance)) {
        const f: Finding = Finding.fromObject({
          name: `Error in ${WithdrawalsSrv.name}.${this.handleUnclaimedRequests.name}:452`,
          description: `Could not get withdrawalQueueBalance. Cause ${withdrawalQueueBalance.left.message}`,
          alertId: 'LIDO-AGENT-ERROR',
          severity: FindingSeverity.Low,
          type: FindingType.Degraded,
          metadata: { stack: `${withdrawalQueueBalance.left.stack}` },
        })

        return [f]
      }

      if (unclaimedStETH.gt(withdrawalQueueBalance.right)) {
        out.push(
          Finding.fromObject({
            name: `🤔 Withdrawals: unclaimed requests size is more than withdrawal queue balance`,
            description: `Unclaimed: ${unclaimedStETH
              .div(ETH_DECIMALS)
              .toFixed(2)} stETH\nWithdrawal queue balance: ${withdrawalQueueBalance.right
              .div(ETH_DECIMALS)
              .toFixed(2)} ETH\nDifference: ${unclaimedStETH.minus(withdrawalQueueBalance.right)} wei`,
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
    const [bunkerEnabled] = filterLog(txEvent.logs, WITHDRAWALS_BUNKER_MODE_ENABLED_EVENT, this.wdQueueContract.address)

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
      this.wdQueueContract.address,
    )
    if (bunkerDisabled) {
      this.cache.setIsBunkerMode(false)
      const delay = formatDelay(txEvent.block.timestamp - Number(this.cache.getBunkerModeEnabledSinceTimestamp()))
      out.push(
        Finding.fromObject({
          name: '✅ Withdrawals: BUNKER MODE OFF! ✅',
          description: `Bunker lasted ${delay}`,
          alertId: 'WITHDRAWALS-BUNKER-DISABLED',
          severity: FindingSeverity.High,
          type: FindingType.Info,
        }),
      )
      return out
    }

    return out
  }

  public handleWithdrawalRequest(txEvent: TransactionEvent): Finding[] {
    const requestEvents = filterLog(
      txEvent.logs,
      WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED_EVENT,
      this.wdQueueContract.address,
    )
    if (!requestEvents) {
      return []
    }

    if (
      this.cache.getFirstUnfinalizedRequestTimestamp() < this.cache.getLastFinalizedTimestamp() &&
      txEvent.timestamp >= this.cache.getLastFinalizedTimestamp()
    ) {
      this.cache.setFirstUnfinalizedRequestTimestamp(txEvent.timestamp)
    }

    const perRequesterAmounts = new Map<string, BigNumber>()
    for (const event of requestEvents) {
      perRequesterAmounts.set(
        event.args.requestor,
        (perRequesterAmounts.get(event.args.requestor) || new BigNumber(0)).plus(
          new BigNumber(String(event.args.amountOfStETH)).div(ETH_DECIMALS),
        ),
      )
    }

    const out: Finding[] = []
    for (const [requester, amounts] of perRequesterAmounts.entries()) {
      if (amounts.gte(BIG_WITHDRAWAL_REQUEST_THRESHOLD)) {
        out.push(
          Finding.fromObject({
            name: `ℹ️ Huge stETH withdrawal requests batch`,
            description: `Requester: ${etherscanAddress(requester)}\nAmount: ${amounts.toFixed(2)} stETH`,
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
            name: `⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than ${BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD} stETH`,
            description: `Amount: ${this.cache.getAmountOfRequestedStETHSinceLastTokenRebase().toFixed(2)} stETH`,
            alertId: 'WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-AFTER-REBASE',
            severity: FindingSeverity.High,
            type: FindingType.Info,
          }),
        )

        this.cache.setLastBigRequestAfterRebaseAlertTimestamp(txEvent.timestamp)
      }
    }

    return out
  }

  public handleLastTokenRebase(txEvent: TransactionEvent): void {
    const [rebaseEvent] = filterLog(txEvent.logs, LIDO_TOKEN_REBASED_EVENT, this.lidoContract.address)
    if (!rebaseEvent) {
      return
    }

    this.cache.setLastTokenRebaseTimestamp(txEvent.timestamp)
    this.cache.setAmountOfRequestedStETHSinceLastTokenRebase(new BigNumber(0))
  }

  public handleWithdrawalFinalized(txEvent: TransactionEvent): void {
    const [withdrawalEvent] = filterLog(
      txEvent.logs,
      WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
      this.wdQueueContract.address,
    )
    if (!withdrawalEvent) {
      return
    }

    const finalizedIds: number[] = []
    for (let i = Number(withdrawalEvent.args.from); i <= Number(withdrawalEvent.args.to); i++) {
      finalizedIds.push(i)
    }

    for (const reqId of finalizedIds) {
      if (!this.cache.getFinalizedWithdrawalRequestsMap().has(reqId)) {
        this.cache.getFinalizedWithdrawalRequestsMap().set(reqId, {
          id: reqId,
          amount: undefined, // will be set in `handleUnclaimedRequests`
          claimed: false,
          timestamp: String(withdrawalEvent.args.timestamp),
        })
      }
    }

    this.cache.setLastFinalizedRequestId(Number(withdrawalEvent.args.to))
    this.cache.setLastFinalizedTimestamp(Number(withdrawalEvent.args.timestamp))
  }

  public handleWithdrawalClaimed(txEvent: TransactionEvent): Finding[] {
    const claimedEvents = filterLog(
      txEvent.logs,
      WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT,
      this.wdQueueContract.address,
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
    for (const event of claimedEvents) {
      const reqId = Number(event.args.requestId)
      if (this.cache.getFinalizedWithdrawalRequestsMap().has(reqId)) {
        const curr = this.cache.getFinalizedWithdrawalRequestsMap().get(reqId) as WithdrawalRequest
        const claimedAmount = new BigNumber(String(event.args.amountOfETH))

        const currAmount = curr.amount === undefined ? new BigNumber(0) : curr.amount

        if (claimedAmount.gt(currAmount)) {
          out.push(
            Finding.fromObject({
              name: `🤔 Withdrawals: claimed amount is more than requested`,
              description: `Request ID: ${etherscanNft(this.wdQueueContract.address, reqId)}\nClaimed: ${claimedAmount
                .div(ETH_DECIMALS)
                .toFixed(2)} ETH\nRequested: ${(curr.amount as BigNumber)
                .div(ETH_DECIMALS)
                .toFixed(2)} stETH\nDifference: ${claimedAmount.minus(
                curr.amount as BigNumber,
              )} wei\nOwner: ${etherscanAddress(event.args.owner)}\nReceiver: ${etherscanAddress(event.args.receiver)}`,
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

        this.cache.getFinalizedWithdrawalRequestsMap().set(reqId, {
          id: curr.id,
          amount: new BigNumber(String(event.args.amountOfETH)),
          claimed: true,
          timestamp: curr.timestamp,
        })
      }
    }

    return out
  }

  public handleEventsOfNotice(txEvent: TransactionEvent, eventsOfNotice: EventOfNotice[]): Finding[] {
    const out: Finding[] = []
    for (const eventInfo of eventsOfNotice) {
      if (eventInfo.address in txEvent.addresses) {
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
