import { BlockEvent, Finding, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import { DualGovernanceDetailedState, IDualGovernanceClient } from './contract'
import { elapsedTime } from '../../shared/time'
import * as E from 'fp-ts/Either'
import { handleEventsOfNotice } from '../../shared/notice'
import { Address } from '../../shared/types'
import BigNumber from 'bignumber.js'
import { GovernanceState } from './types'
import {
  vetoSignallingEscrowThresholdHandler,
  VetoSignallingThresholdResult,
  rageQuitEscrowThresholdHandler,
  RageQuitThresholdResult,
} from './handlers/'

import {
  DUAL_GOVERNANCE_COMMITTEE_RELATED_EVENTS,
  DUAL_GOVERNANCE_PROPOSAL_STATUS_EVENTS,
  DUAL_GOVERNANCE_STATE_CHANGE_EVENTS,
} from './events'

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

    return findings
  }
}
