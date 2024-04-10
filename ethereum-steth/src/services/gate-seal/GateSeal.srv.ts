import { elapsedTime, formatDelay } from '../../utils/time'
import * as E from 'fp-ts/Either'
import { GateSealExpiredErr } from '../../entity/gate_seal'
import { GateSealCache } from './GateSeal.cache'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT, GATE_SEAL_SEALED_EVENT } from '../../utils/events/gate_seal_events'
import { etherscanAddress } from '../../utils/string'
import { Logger } from 'winston'
import { networkAlert } from '../../utils/errors'
import { IGateSealClient } from './contract'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto } from '../../entity/events'

const ONE_HOUR = 60 * 60
const ONE_DAY = 24 * ONE_HOUR
const ONE_WEEK = 7 * ONE_DAY
const ONE_MONTH = ONE_WEEK * 4
const THREE_MONTHS = ONE_MONTH * 3

const GATE_SEAL_WITHOUT_PAUSE_ROLE_TRIGGER_EVERY = ONE_DAY

const GATE_SEAL_EXPIRY_TRIGGER_EVERY = ONE_WEEK
const GATE_SEAL_EXPIRY_THRESHOLD = THREE_MONTHS

export class GateSealSrv {
  private readonly name = 'GateSealSrv'
  private readonly logger: Logger

  private readonly ethProvider: IGateSealClient
  private readonly cache: GateSealCache
  private readonly gateSealFactoryAddress: string

  private gateSealAddress: string | undefined

  constructor(
    logger: Logger,
    ethProvider: IGateSealClient,
    cache: GateSealCache,
    gateSealAddress: string,
    gateSealFactoryAddress: string,
  ) {
    this.logger = logger
    this.ethProvider = ethProvider
    this.cache = cache
    this.gateSealAddress = gateSealAddress
    this.gateSealFactoryAddress = gateSealFactoryAddress
  }

  public async initialize(currentBlock: number): Promise<Finding[] | Error> {
    const start = new Date().getTime()
    const out: Finding[] = []
    if (this.gateSealAddress === undefined) {
      return new Error(`Gate seal address is not provided`)
    }

    const status = await this.ethProvider.checkGateSeal(currentBlock, this.gateSealAddress)
    if (E.isLeft(status)) {
      if (status.left === GateSealExpiredErr) {
        const f = Finding.fromObject({
          name: '⚠️ GateSeal: default GateSeal address in forta agent is expired',
          description: `GateSeal address: ${etherscanAddress(this.gateSealAddress)}]`,
          alertId: 'GATE-SEAL-DEFAULT-EXPIRED',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })

        out.push(f)
        this.logger.info(elapsedTime(`[${this.name}.initialize]`, start) + `on block ${currentBlock}`)

        return out
      }

      return status.left
    }

    if (!status.right.roleForExitBus || !status.right.roleForWithdrawalQueue) {
      let additionalDesc = ''
      if (!status.right.roleForExitBus) {
        additionalDesc += `\nNo PAUSE_ROLE for ExitBus address: ${etherscanAddress(status.right.exitBusOracleAddress)}`
      }
      if (!status.right.roleForWithdrawalQueue) {
        additionalDesc += `\nNo PAUSE_ROLE for WithdrawalQueue address: ${etherscanAddress(
          status.right.withdrawalQueueAddress,
        )}`
      }

      const f = Finding.fromObject({
        name: "⚠️ GateSeal: default GateSeal address in forta agent doesn't have PAUSE_ROLE for contracts",
        description: `GateSeal address: ${etherscanAddress(this.gateSealAddress)}${additionalDesc}`,
        alertId: 'GATE-SEAL-DEFAULT-WITHOUT-ROLE',
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
      })

      out.push(f)
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return out
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [pauseRoleFindings, expiryGateSealFindings] = await Promise.all([
      this.handlePauseRole(blockDto),
      this.handleExpiryGateSeal(blockDto),
    ])

    findings.push(...pauseRoleFindings, ...expiryGateSealFindings)
    this.logger.info(elapsedTime(GateSealSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handlePauseRole(blockDto: BlockDto): Promise<Finding[]> {
    const out: Finding[] = []
    if (this.gateSealAddress === undefined) {
      return []
    }

    const currentBlockTimestamp = blockDto.timestamp
    const status = await this.ethProvider.checkGateSeal(blockDto.number, this.gateSealAddress)
    if (E.isLeft(status)) {
      if (status.left === GateSealExpiredErr) {
        const f = Finding.fromObject({
          name: '⚠️ GateSeal: default GateSeal address in forta agent is expired',
          description: `GateSeal address: ${etherscanAddress(this.gateSealAddress)}]`,
          alertId: 'GATE-SEAL-DEFAULT-EXPIRED',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })

        out.push(f)

        return out
      }

      out.push(
        networkAlert(
          status.left,
          `Error in ${GateSealSrv.name}.${this.handlePauseRole.name}:125`,
          `Could not call ethProvider.checkGateSeal`,
        ),
      )

      return out
    }

    if (!status.right.roleForExitBus || !status.right.roleForWithdrawalQueue) {
      let additionalDesc = ''
      if (!status.right.roleForExitBus) {
        additionalDesc += `\nNo PAUSE_ROLE for ExitBus address: ${etherscanAddress(status.right.exitBusOracleAddress)}`
      }
      if (!status.right.roleForWithdrawalQueue) {
        additionalDesc += `\nNo PAUSE_ROLE for WithdrawalQueue address: ${etherscanAddress(
          status.right.withdrawalQueueAddress,
        )}`
      }
      if (
        currentBlockTimestamp - this.cache.getLastNoPauseRoleAlertTimestamp() >
        GATE_SEAL_WITHOUT_PAUSE_ROLE_TRIGGER_EVERY
      ) {
        out.push(
          Finding.fromObject({
            name: "🚨 GateSeal: actual address doesn't have PAUSE_ROLE for contracts",
            description: `GateSeal address: ${etherscanAddress(this.gateSealAddress)}${additionalDesc}`,
            alertId: 'GATE-SEAL-WITHOUT-PAUSE-ROLE',
            severity: FindingSeverity.High,
            type: FindingType.Degraded,
          }),
        )

        this.cache.setLastNoPauseRoleAlertTimestamp(currentBlockTimestamp)
      }
    }

    return out
  }

  public async handleExpiryGateSeal(blockDto: BlockDto): Promise<Finding[]> {
    if (this.gateSealAddress === undefined) {
      return []
    }

    const currentBlockTimestamp = blockDto.timestamp
    const expiryTimestamp = await this.ethProvider.getExpiryTimestamp(blockDto.number)

    if (E.isLeft(expiryTimestamp)) {
      return [
        networkAlert(
          expiryTimestamp.left,
          `Error in ${GateSealSrv.name}.${this.handleExpiryGateSeal.name}:189`,
          `Could not call ethProvider.getExpiryTimestamp`,
        ),
      ]
    }

    const out: Finding[] = []
    if (expiryTimestamp.right.eq(0) || expiryTimestamp.right.toNumber() <= currentBlockTimestamp) {
      out.push(
        Finding.fromObject({
          name: '🚨 GateSeal: is expired!',
          description: `GateSeal address: ${etherscanAddress(this.gateSealAddress)}}`,
          alertId: 'GATE-SEAL-IS-EXPIRED',
          severity: FindingSeverity.High,
          type: FindingType.Degraded,
        }),
      )
      this.gateSealAddress = undefined
    } else if (
      currentBlockTimestamp - this.cache.getLastExpiryGateSealAlertTimestamp() >
      GATE_SEAL_EXPIRY_TRIGGER_EVERY
    ) {
      if (expiryTimestamp.right.toNumber() - currentBlockTimestamp <= GATE_SEAL_EXPIRY_THRESHOLD) {
        out.push(
          Finding.fromObject({
            name: '⚠️ GateSeal: is about to be expired',
            description: `GateSeal address: ${etherscanAddress(this.gateSealAddress)}\nExpiry date ${new Date(
              expiryTimestamp.right.toNumber() * 1000,
            ).toUTCString()}`,
            alertId: 'GATE-SEAL-IS-ABOUT-TO-BE-EXPIRED',
            severity: FindingSeverity.Medium,
            type: FindingType.Degraded,
          }),
        )
        this.cache.setLastExpiryGateSealAlertTimestamp(currentBlockTimestamp)
      }
    }

    return out
  }

  public handleTransaction(txEvent: TransactionEvent): Finding[] {
    const findings: Finding[] = []

    const sealedGateSealFindings = this.handleSealedGateSeal(txEvent)
    const newGateSealFindings = this.handleNewGateSeal(txEvent)

    findings.push(...sealedGateSealFindings, ...newGateSealFindings)

    return findings
  }

  public handleSealedGateSeal(txEvent: TransactionEvent): Finding[] {
    if (this.gateSealAddress === undefined) {
      return []
    }
    const sealedEvents = filterLog(txEvent.logs, GATE_SEAL_SEALED_EVENT, this.gateSealAddress)
    if (sealedEvents.length === 0) {
      return []
    }

    const out: Finding[] = []
    for (const sealedEvent of sealedEvents) {
      const { sealed_by, sealed_for, sealable } = sealedEvent.args
      const duration = formatDelay(Number(sealed_for))
      out.push(
        Finding.fromObject({
          name: '🚨🚨🚨 GateSeal: is sealed 🚨🚨🚨',
          description: `GateSeal address: ${etherscanAddress(this.gateSealAddress)}\nSealed by: ${etherscanAddress(
            sealed_by,
          )}\nSealed for: ${duration}\nSealable: ${etherscanAddress(sealable)}`,
          alertId: 'GATE-SEAL-IS-SEALED',
          severity: FindingSeverity.Critical,
          type: FindingType.Info,
        }),
      )
    }

    return out
  }

  public handleNewGateSeal(txEvent: TransactionEvent): Finding[] {
    const newGateSealEvents = filterLog(
      txEvent.logs,
      GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT,
      this.gateSealFactoryAddress,
    )
    if (newGateSealEvents.length === 0) {
      return []
    }

    const out: Finding[] = []
    for (const newGateSealEvent of newGateSealEvents) {
      const { gate_seal } = newGateSealEvent.args
      out.push(
        Finding.fromObject({
          name: '⚠️ GateSeal: a new instance deployed from factory',
          description: `New instance address: ${etherscanAddress(
            gate_seal,
          )}\ndev: Please, check if \`GATE_SEAL_DEFAULT_ADDRESS\` should be updated in the nearest future`,
          alertId: 'GATE-SEAL-NEW-ONE-CREATED',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      )
      this.gateSealAddress = gate_seal
    }

    return out
  }
}
