import { elapsedTime, formatDelay } from '../../utils/time'
import { either as E } from 'fp-ts'
import { GateSeal, GateSealExpiredErr } from '../../entity/gate_seal'
import { GateSealCache } from './GateSeal.cache'
import { GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT, GATE_SEAL_SEALED_EVENT } from '../../utils/events/gate_seal_events'
import { etherscanAddress } from '../../utils/string'
import { Logger } from 'winston'
import { networkAlert } from '../../utils/errors'
import { BlockDto, TransactionDto } from '../../entity/events'
import BigNumber from 'bignumber.js'
import { Finding } from '../../generated/proto/alert_pb'
import { ethers } from 'forta-agent'

const ONE_HOUR = 60 * 60
const ONE_DAY = 24 * ONE_HOUR
const ONE_WEEK = 7 * ONE_DAY
const TWO_WEEKS = 2 * ONE_WEEK
const ONE_MONTH = ONE_WEEK * 4
const THREE_MONTHS = ONE_MONTH * 3

export abstract class IGateSealClient {
  public abstract checkGateSeal(blockNumber: number, gateSealAddress: string): Promise<E.Either<Error, GateSeal>>

  public abstract getExpiryTimestamp(blockNumber: number): Promise<E.Either<Error, BigNumber>>
}

export class GateSealSrv {
  private readonly name = 'GateSealSrv'
  private readonly logger: Logger

  private readonly gateSealClient: IGateSealClient
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
    this.gateSealClient = ethProvider
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

    const status = await this.gateSealClient.checkGateSeal(currentBlock, this.gateSealAddress)
    if (E.isLeft(status)) {
      if (status.left === GateSealExpiredErr) {
        const f: Finding = new Finding()
        f.setName('⚠️ GateSeal: default GateSeal address in forta agent is expired')
        f.setDescription(`GateSeal address: ${etherscanAddress(this.gateSealAddress)}]`)
        f.setAlertid('GATE-SEAL-DEFAULT-EXPIRED')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

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

      const f: Finding = new Finding()
      f.setName("⚠️ GateSeal: default GateSeal address in forta agent doesn't have PAUSE_ROLE for contracts")
      f.setDescription(`GateSeal address: ${etherscanAddress(this.gateSealAddress)}${additionalDesc}`)
      f.setAlertid('GATE-SEAL-DEFAULT-WITHOUT-ROLE')
      f.setSeverity(Finding.Severity.MEDIUM)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

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
    const status = await this.gateSealClient.checkGateSeal(blockDto.number, this.gateSealAddress)
    if (E.isLeft(status)) {
      if (status.left === GateSealExpiredErr) {
        const f: Finding = new Finding()
        f.setName('⚠️ GateSeal: default GateSeal address in forta agent is expired')
        f.setDescription(`GateSeal address: ${etherscanAddress(this.gateSealAddress)}]`)
        f.setAlertid('GATE-SEAL-DEFAULT-EXPIRED')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

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
      if (currentBlockTimestamp - this.cache.getLastNoPauseRoleAlertTimestamp() > ONE_DAY) {
        const f: Finding = new Finding()
        f.setName("🚨 GateSeal: actual address doesn't have PAUSE_ROLE for contracts")
        f.setDescription(`GateSeal address: ${etherscanAddress(this.gateSealAddress)}${additionalDesc}`)
        f.setAlertid('GATE-SEAL-DEFAULT-EXPIRED')
        f.setSeverity(Finding.Severity.HIGH)
        f.setType(Finding.FindingType.DEGRADED)
        f.setProtocol('ethereum')

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
    const expiryTimestamp = await this.gateSealClient.getExpiryTimestamp(blockDto.number)

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
      const f: Finding = new Finding()
      f.setName('🚨 GateSeal: is expired!')
      f.setDescription(`GateSeal address: ${etherscanAddress(this.gateSealAddress)}}`)
      f.setAlertid('GATE-SEAL-IS-EXPIRED')
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.DEGRADED)
      f.setProtocol('ethereum')

      out.push(f)

      this.gateSealAddress = undefined
    } else if (currentBlockTimestamp - this.cache.getLastExpiryGateSealAlertTimestamp() > TWO_WEEKS) {
      if (expiryTimestamp.right.toNumber() - currentBlockTimestamp <= THREE_MONTHS) {
        const f: Finding = new Finding()
        f.setName('⚠️ GateSeal: is about to be expired')
        f.setDescription(
          `GateSeal address: ${etherscanAddress(this.gateSealAddress)}\nExpiry date ${new Date(expiryTimestamp.right.toNumber() * 1000).toUTCString()}`,
        )
        f.setAlertid('GATE-SEAL-IS-ABOUT-TO-BE-EXPIRED')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.DEGRADED)
        f.setProtocol('ethereum')
        out.push(f)

        this.cache.setLastExpiryGateSealAlertTimestamp(currentBlockTimestamp)
      }
    }

    return out
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const findings: Finding[] = []

    const sealedGateSealFindings = this.handleSealedGateSeal(txEvent)
    const newGateSealFindings = this.handleNewGateSeal(txEvent)

    findings.push(...sealedGateSealFindings, ...newGateSealFindings)

    return findings
  }

  public handleSealedGateSeal(txEvent: TransactionDto): Finding[] {
    if (this.gateSealAddress === undefined) {
      return []
    }

    const iface = new ethers.utils.Interface([GATE_SEAL_SEALED_EVENT])
    const out: Finding[] = []
    for (const log of txEvent.logs) {
      if (log.address.toLowerCase() !== this.gateSealAddress.toLowerCase()) {
        continue
      }

      try {
        const sealedEvent = iface.parseLog(log)
        const { sealed_by, sealed_for, sealable } = sealedEvent.args
        const duration = formatDelay(Number(sealed_for))

        const f: Finding = new Finding()
        f.setName('🚨🚨🚨 GateSeal: is sealed 🚨🚨🚨')
        f.setDescription(
          `GateSeal address: ${etherscanAddress(this.gateSealAddress)}\nSealed by: ${etherscanAddress(
            sealed_by,
          )}\nSealed for: ${duration}\nSealable: ${etherscanAddress(sealable)}`,
        )
        f.setAlertid('GATE-SEAL-IS-SEALED')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      } catch (e) {
        // Only one from eventsOfNotice could be correct
        // Others - skipping
      }
    }

    return out
  }

  public handleNewGateSeal(txEvent: TransactionDto): Finding[] {
    const iface = new ethers.utils.Interface([GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT])
    const out: Finding[] = []

    for (const log of txEvent.logs) {
      if (log.address.toLowerCase() !== this.gateSealFactoryAddress.toLowerCase()) {
        continue
      }

      try {
        const newGateSealEvent = iface.parseLog(log)
        const { gate_seal } = newGateSealEvent.args

        const f: Finding = new Finding()
        f.setName('⚠️ GateSeal: a new instance deployed from factory')
        f.setDescription(
          `New instance address: ${etherscanAddress(
            gate_seal,
          )}\ndev: Please, check if \`GATE_SEAL_DEFAULT_ADDRESS\` should be updated in the nearest future`,
        )
        f.setAlertid('GATE-SEAL-NEW-ONE-CREATED')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
        this.gateSealAddress = gate_seal
      } catch (e) {
        // Only one from eventsOfNotice could be correct
        // Others - skipping
      }
    }

    return out
  }
}
