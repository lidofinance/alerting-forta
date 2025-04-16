import { BlockEvent, Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import { DualGovernanceDetailedState, IDualGovernanceClient } from './contract'
import { elapsedTime } from '../../shared/time'
import * as E from 'fp-ts/Either'
import { handleEventsOfNotice } from '../../shared/notice'
import { Address } from '../../shared/types'
import BigNumber from 'bignumber.js'
import { GovernanceState } from './types'
import {
  rageQuitEscrowThresholdHandler,
  RageQuitThresholdResult,
  vetoSignallingEscrowThresholdHandler,
  VetoSignallingThresholdResult,
} from './handlers/'

import {
  DUAL_GOVERNANCE_COMMITTEE_RELATED_EVENTS,
  DUAL_GOVERNANCE_PROPOSAL_STATUS_EVENTS,
  DUAL_GOVERNANCE_STATE_CHANGE_EVENTS,
  PROPOSAL_CANCELLED_SIGNATURE,
  PROPOSAL_EXECUTED_SIGNATURE,
  PROPOSAL_SCHEDULED_SIGNATURE,
  PROPOSAL_SUBMITTED_SIGNATURE,
} from './events'
import { DUAL_GOVERNANCE_ADDRESS, EMERGENCY_PROTECTED_TIMELOCK_ADDRESS } from 'constants/common'

interface ProposalTimerState {
  startTime: number
  startBlock: number
  type: 'submitted' | 'scheduled'
  proposalId: string
}

export class DualGovernanceSrv {
  private readonly logger: Logger
  private readonly name = 'DualGovernanceSrv'
  private readonly ethProvider: IDualGovernanceClient
  private vetoSignallingEscrowAddress: Address = '0x'
  private rageQuitEscrowAddress: Address = '0x'
  private firstSealSupport: BigNumber = new BigNumber(0)
  private secondSealSupport: BigNumber = new BigNumber(0)
  private lastAlertedVetoSignallingThresholdLevel: number = 0
  private lastAlertedRageQuitThresholdLevel: number = 0
  private currentMonitoredState: GovernanceState | null = null
  private afterSubmitDelay: number | null = null
  private afterScheduleDelay: number | null = null
  private activeProposalTimers: Map<string, ProposalTimerState> = new Map()

  constructor(logger: Logger, ethProvider: IDualGovernanceClient) {
    this.logger = logger
    this.ethProvider = ethProvider
  }

  public getName(): string {
    return this.name
  }

  public async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    this.logger.info(`[${this.name}.initialize] Starting initialization at block ${currentBlock}...`)

    try {
      const dgConfig = await this.ethProvider.getConfig()
      if (E.isRight(dgConfig)) {
        this.firstSealSupport = dgConfig.right.firstSealRageQuitSupport
        this.secondSealSupport = dgConfig.right.secondSealRageQuitSupport
        this.logger.info(`[${this.name}.initialize] firstSealThreshold loaded: ${this.firstSealSupport.toString()}`)
        this.logger.info(`[${this.name}.initialize] secondSealThreshold loaded: ${this.secondSealSupport.toString()}`)
        if (this.firstSealSupport.lte(0) || this.secondSealSupport.lte(0)) {
          this.logger.warn(
            `[${this.name}.initialize] One or more fetched SealThresholds are zero or negative. Threshold alerts may not work.`,
          )
        }
      } else {
        throw dgConfig.left
      }
    } catch (error) {
      this.logger.error(`[${this.name}.initialize] Failed to fetch SealThreshold: ${error}`)
    }

    try {
      const vetoSignallingEscrowAddress = await this.ethProvider.getVetoSignallingEscrow()
      if (E.isRight(vetoSignallingEscrowAddress)) {
        this.vetoSignallingEscrowAddress = vetoSignallingEscrowAddress.right
        this.logger.info(
          `[${this.name}.initialize] VetoSignalling Escrow address loaded: ${this.vetoSignallingEscrowAddress}`,
        )
      } else {
        throw vetoSignallingEscrowAddress.left
      }
    } catch (error) {
      this.logger.error(`[${this.name}.initialize] Failed to fetch VS escrow address: ${error}`)
    }

    try {
      const rageQuitEscrowAddress = await this.ethProvider.getRageQuitEscrow()
      if (E.isRight(rageQuitEscrowAddress)) {
        this.rageQuitEscrowAddress = rageQuitEscrowAddress.right
        this.logger.info(`[${this.name}.initialize] RageQuit Escrow address loaded: ${this.rageQuitEscrowAddress}`)
      } else {
        throw rageQuitEscrowAddress.left
      }
    } catch (error) {
      this.logger.error(`[${this.name}.initialize] Failed to fetch VS escrow address: ${error}`)
    }

    try {
      const proposalsDelays = await this.ethProvider.getProposalsDelays()
      if (E.isRight(proposalsDelays)) {
        this.afterSubmitDelay = proposalsDelays.right.afterSubmitDelay
        this.afterScheduleDelay = proposalsDelays.right.afterScheduleDelay
      }
    } catch (error) {
      this.logger.error(`[${this.name}.initialize] Failed to fetch proposals delays: ${error}`)
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize] Completed on ${currentBlock}`, start))
    return null
  }

  public async handleTransaction(txEvent: TransactionEvent) {
    const findings: Finding[] = []
    const start = new Date().getTime()

    const [findingsEventsOfNotice] = await Promise.all([
      handleEventsOfNotice(txEvent, [
        ...DUAL_GOVERNANCE_STATE_CHANGE_EVENTS,
        ...DUAL_GOVERNANCE_PROPOSAL_STATUS_EVENTS,
        ...DUAL_GOVERNANCE_COMMITTEE_RELATED_EVENTS,
      ]),
    ])

    findings.push(...findingsEventsOfNotice)
    this.logger.debug(elapsedTime(DualGovernanceSrv.name + '.' + this.handleTransaction.name, start))

    const proposalSubmittedLogs: LogDescription[] =
      txEvent.filterLog(PROPOSAL_SUBMITTED_SIGNATURE, DUAL_GOVERNANCE_ADDRESS) || []

    proposalSubmittedLogs.forEach((log) => {
      const proposalId = log.args.proposalId.toString()
      const key = `${proposalId}-submitted`
      if (this.afterSubmitDelay !== null && this.afterSubmitDelay > 0) {
        if (!this.activeProposalTimers.has(key)) {
          this.activeProposalTimers.set(key, {
            startTime: txEvent.timestamp,
            startBlock: txEvent.blockNumber,
            type: 'submitted',
            proposalId: proposalId,
          })
          this.logger.info(
            `[${this.name}] Started 'afterSubmitDelay' timer (${this.afterSubmitDelay}s) for proposal ${proposalId} (key: ${key})`,
          )
        }
      } else {
        this.logger.warn(
          `[${this.name}] afterSubmitDelay is not valid (${this.afterSubmitDelay}), cannot start timer for submitted proposal ${proposalId}.`,
        )
      }
    })

    const proposalScheduledLogs: LogDescription[] =
      txEvent.filterLog(PROPOSAL_SCHEDULED_SIGNATURE, EMERGENCY_PROTECTED_TIMELOCK_ADDRESS) || []
    proposalScheduledLogs.forEach((log) => {
      const proposalId = log.args.id.toString()
      const key = `${proposalId}-scheduled`
      if (this.afterScheduleDelay !== null && this.afterScheduleDelay > 0) {
        if (!this.activeProposalTimers.has(key)) {
          this.activeProposalTimers.set(key, {
            startTime: txEvent.timestamp,
            startBlock: txEvent.blockNumber,
            type: 'scheduled',
            proposalId: proposalId,
          })
          this.logger.info(
            `[${this.name}] Started 'afterScheduleDelay' timer (${this.afterScheduleDelay}s) for proposal ${proposalId} (key: ${key})`,
          )
        }
      } else {
        this.logger.warn(
          `[${this.name}] afterScheduleDelay is not valid (${this.afterScheduleDelay}), cannot start timer for scheduled proposal ${proposalId}.`,
        )
      }
    })

    const proposalExecutedLogs: LogDescription[] =
      txEvent.filterLog(PROPOSAL_EXECUTED_SIGNATURE, EMERGENCY_PROTECTED_TIMELOCK_ADDRESS) || []
    proposalExecutedLogs.forEach((log) => {
      const proposalId = log.args.id.toString()
      const submittedKey = `${proposalId}-submitted`
      const scheduledKey = `${proposalId}-scheduled`
      if (this.activeProposalTimers.delete(submittedKey)) {
        this.logger.info(`[${this.name}] Deleted 'submitted' timer for executed proposal ${proposalId}`)
      }
      if (this.activeProposalTimers.delete(scheduledKey)) {
        this.logger.info(`[${this.name}] Deleted 'scheduled' timer for executed proposal ${proposalId}`)
      }
    })

    const proposalCancelledLogs: LogDescription[] =
      txEvent.filterLog(PROPOSAL_CANCELLED_SIGNATURE, EMERGENCY_PROTECTED_TIMELOCK_ADDRESS) || []
    proposalCancelledLogs.forEach((log) => {
      const proposalId = log.args.proposalId.toString() // Adjust arg name if needed
      const submittedKey = `${proposalId}-submitted`
      const scheduledKey = `${proposalId}-scheduled`
      if (this.activeProposalTimers.delete(submittedKey)) {
        this.logger.info(`[${this.name}] Deleted 'submitted' timer for cancelled proposal ${proposalId}`)
      }
      if (this.activeProposalTimers.delete(scheduledKey)) {
        this.logger.info(`[${this.name}] Deleted 'scheduled' timer for cancelled proposal ${proposalId}`)
      }
    })

    return findings
  }

  public async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
    const findings: Finding[] = []
    let rageQuitSupport: BigNumber = new BigNumber(0)
    let dualGovernanceStateDetails: DualGovernanceDetailedState | null = null

    if (this.secondSealSupport.lte(0)) {
      if (blockEvent.blockNumber % 100 === 0) {
        this.logger.warn(
          `[${this.name}.handleBlock] Block ${blockEvent.blockNumber}. Second seal threshold not loaded or zero, skipping veto checks.`,
        )
      }
      return findings
    }

    const [_rageQuitSupport, _dualGovernanceStateDetails] = await Promise.all([
      this.secondSealSupport.gt(0) ||
      this.currentMonitoredState === GovernanceState.Normal ||
      this.currentMonitoredState === GovernanceState.VetoSignalling
        ? this.ethProvider.getRageQuitSupport(this.vetoSignallingEscrowAddress)
        : Promise.resolve(E.right(new BigNumber(0))),
      this.ethProvider.getDualGovernanceStateDetails(),
    ])

    if (E.isLeft(_rageQuitSupport)) {
      this.logger.error(`[${this.name}.handleBlock] Failed to fetch RageQuit support: ${_rageQuitSupport.left}`)
      return findings
    }

    rageQuitSupport = _rageQuitSupport.right

    if (E.isLeft(_dualGovernanceStateDetails)) {
      this.logger.error(
        `[${this.name}.handleBlock] Failed to fetch DualGovernance state details: ${_dualGovernanceStateDetails.left}`,
      )
      return findings
    }
    dualGovernanceStateDetails = _dualGovernanceStateDetails.right

    if (this.currentMonitoredState !== dualGovernanceStateDetails.persistedState) {
      this.logger.info(
        `[${this.name}.handleBlock] Governance state changed from ${this.currentMonitoredState} to ${dualGovernanceStateDetails.persistedState}. Resetting threshold alert levels.`,
      )
      this.currentMonitoredState = dualGovernanceStateDetails.persistedState
      if (
        this.currentMonitoredState !== GovernanceState.Normal &&
        this.currentMonitoredState !== GovernanceState.VetoSignalling
      ) {
        this.lastAlertedVetoSignallingThresholdLevel = 0
      }
      if (this.currentMonitoredState !== GovernanceState.RageQuit) {
        this.lastAlertedRageQuitThresholdLevel = 0
      }
    }

    // --- VetoSignalling threshold check ---
    if (dualGovernanceStateDetails.persistedState === GovernanceState.Normal) {
      if (this.firstSealSupport.lte(0)) {
        if (blockEvent.blockNumber % 100 === 0) {
          this.logger.warn(
            `[${this.name}.handleBlock] Block ${blockEvent.blockNumber}. First seal threshold not loaded or zero, skipping veto checks.`,
          )
        }
      } else {
        const vetoResult: VetoSignallingThresholdResult = vetoSignallingEscrowThresholdHandler({
          rageQuitSupport,
          firstSealSupport: this.firstSealSupport,
          blockEvent,
          lastAlertedLevel: this.lastAlertedVetoSignallingThresholdLevel,
        })

        if (vetoResult.finding) {
          findings.push(vetoResult.finding)
          this.logger.info(
            `[${this.name}.handleBlock] New Veto Signalling threshold alert triggered: Level ${vetoResult.triggeredLevel}%`,
          )
          this.lastAlertedVetoSignallingThresholdLevel = vetoResult.triggeredLevel
        } else if (vetoResult.triggeredLevel > this.lastAlertedVetoSignallingThresholdLevel) {
          this.logger.warn(
            `[${this.name}.handleBlock] VetoSignalling threshold ${vetoResult.triggeredLevel}% crossed, but handler returned no finding.`,
          )
        }
      }
    }

    // --- RageQuit threshold check ---
    if (GovernanceState.VetoSignalling) {
      if (this.secondSealSupport.lte(0)) {
        if (blockEvent.blockNumber % 100 === 0) {
          this.logger.warn(
            `[${this.name}.handleBlock] Block ${blockEvent.blockNumber}. Second seal threshold not loaded or zero, skipping veto checks.`,
          )
        }
      } else {
        const vetoResult: RageQuitThresholdResult = rageQuitEscrowThresholdHandler({
          rageQuitSupport,
          secondSealSupport: this.secondSealSupport,
          blockEvent,
          lastAlertedLevel: this.lastAlertedRageQuitThresholdLevel,
        })

        if (vetoResult.finding) {
          findings.push(vetoResult.finding)
          this.logger.info(
            `[${this.name}.handleBlock] New RageQuit threshold alert triggered: Level ${vetoResult.triggeredLevel}%`,
          )
          this.lastAlertedRageQuitThresholdLevel = vetoResult.triggeredLevel
        } else if (vetoResult.triggeredLevel > this.lastAlertedRageQuitThresholdLevel) {
          this.logger.warn(
            `[${this.name}.handleBlock] Veto Signalling threshold ${vetoResult.triggeredLevel}% crossed, but handler returned no finding.`,
          )
        }
      }
    }

    const currentTimestamp = blockEvent.block.timestamp
    const currentBlockNumber = blockEvent.block.number
    const expiredTimerKeys: string[] = []

    for (const [key, timerState] of this.activeProposalTimers.entries()) {
      let timeoutDuration: number | null = null
      let alertName = ''
      let alertDesc = ''
      let alertId = ''

      if (timerState.type === 'submitted') {
        timeoutDuration = this.afterSubmitDelay
        alertName = 'Proposal Submission Timelock Ended'
        alertDesc = ` Submission timelock ended for proposal ${timerState.proposalId}. It is now ready to be scheduled.`
        alertId = 'DUAL-GOVERNANCE-SUBMISSION-TIMELOCK-ENDED'
      } else if (timerState.type === 'scheduled') {
        timeoutDuration = this.afterScheduleDelay
        alertName = 'Proposal Scheduled Timelock Ended'
        alertDesc = `Scheduled timelock ended for proposal ${timerState.proposalId}. It is now ready for execution.`
        alertId = 'DUAL-GOVERNANCE-SCHEDULING-TIMELOCK-ENDED'
      }

      if (timeoutDuration !== null && timeoutDuration > 0) {
        const elapsedTime = currentTimestamp - timerState.startTime

        if (elapsedTime >= timeoutDuration) {
          this.logger.info(`[${this.name}] Timeout reached for proposal timer key: ${key}`)
          findings.push(
            Finding.fromObject({
              name: alertName,
              description: alertDesc,
              alertId: alertId,
              severity: FindingSeverity.Info,
              type: FindingType.Info,
              metadata: {
                proposalId: timerState.proposalId,
                alertTimestamp: currentTimestamp.toString(),
                alertBlock: currentBlockNumber.toString(),
              },
            }),
          )
          expiredTimerKeys.push(key)
        }
      } else {
        this.logger.warn(
          `[${this.name}] Invalid or missing timeout duration (${timerState.type === 'submitted' ? 'afterSubmitDelay' : 'afterScheduleDelay'} = ${timeoutDuration}) for timer key: ${key}. Removing timer.`,
        )
        expiredTimerKeys.push(key)
      }
    }

    expiredTimerKeys.forEach((key) => this.activeProposalTimers.delete(key))

    return findings
  }
}
