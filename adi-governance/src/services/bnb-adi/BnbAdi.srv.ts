import { BlockEvent, Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from 'forta-agent'
import { etherscanAddress } from '../../shared/string'
import { CROSS_CHAIN_CONTROLLER } from 'constants/common'
import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../shared/time'
import { Logger } from 'winston'
import { networkAlert } from '../../shared/errors'
import { APPROVED_SENDER_ETH } from 'src/shared/constants/bnb-adi/mainnet'
import { IBnbAdiEthClient } from './contract'
import { SENDER_UPDATED_EVENT } from 'src/shared/events/cross_chain_controller_events'

interface IPermission {
  app: string
  entity: string
  role: string
  state: string
}

const byLogIndexAsc = (e1: LogDescription, e2: LogDescription) => e1.logIndex - e2.logIndex

export class BnbAdiSrv {
  private readonly logger: Logger
  private readonly name = 'BnbAdiSrv'
  private readonly ethProvider: IBnbAdiEthClient

  constructor(logger: Logger, ethProvider: IBnbAdiEthClient) {
    this.logger = logger
    this.ethProvider = ethProvider
  }

  public initialize(currentBlock: number): null {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public eventToPermissionKey(event: LogDescription) {
    return `${event.args.app}-${event.args.entity}-${event.args.role}`
  }
  public eventToPermissionObj(event: LogDescription, state: string): IPermission {
    return {
      app: event.args.app,
      entity: event.args.entity,
      role: event.args.role,
      state: state,
    }
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [approvedSenderFindings] = await Promise.all([this.handleApprovedSender(blockEvent)])

    findings.push(...approvedSenderFindings)
    this.logger.info(elapsedTime(BnbAdiSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleTransaction(txEvent: TransactionEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [senderUpdatedFindings] = await Promise.all([this.handleSenderUpdated(txEvent)])

    findings.push(...senderUpdatedFindings)

    this.logger.debug(elapsedTime(BnbAdiSrv.name + '.' + this.handleTransaction.name, start))

    return findings
  }

  public async handleApprovedSender(blockEvent: BlockEvent): Promise<Finding[]> {
    const findings: Finding[] = []

    const isSenderApproved = await this.ethProvider.isSenderApproved(APPROVED_SENDER_ETH, blockEvent.blockNumber)

    if (E.isLeft(isSenderApproved)) {
      findings.push(
        networkAlert(
          isSenderApproved.left,
          `Error in ${BnbAdiSrv.name}.${this.handleApprovedSender.name}`,
          `Could not call thProvider.isSenderApproved for address - ${APPROVED_SENDER_ETH}`,
        ),
      )
    } else if (!isSenderApproved.right) {
      findings.push(
        Finding.fromObject({
          name: `🚨🚨🚨 BNB a.DI: Approved sender (DAO Agent) changed`,
          description:
            `Address ${etherscanAddress(APPROVED_SENDER_ETH)} is not an approved sender anymore.` +
            `\nPlease update the constants file if the change was expected.`,
          alertId: 'ADI-BNB-DAO-AGENT-NOT-APPROVED',
          severity: FindingSeverity.Critical,
          type: FindingType.Info,
        }),
      )
    }

    return findings
  }

  public async handleSenderUpdated(txEvent: TransactionEvent) {
    const findings: Finding[] = []

    const senderUpdatedEvents = txEvent.filterLog(SENDER_UPDATED_EVENT, CROSS_CHAIN_CONTROLLER)
    senderUpdatedEvents.sort(byLogIndexAsc)

    senderUpdatedEvents.forEach((event) => {
      if (event.args.address?.toLowerCase() !== APPROVED_SENDER_ETH) {
        findings.push(
          Finding.fromObject({
            name: `🚨🚨🚨 BNB a.DI: Approved senders list updated`,
            description: event.args.isApproved
              ? `Address ${etherscanAddress(event.args.address)} was set as an approved sender`
              : `Address ${etherscanAddress(event.args.address)} was removed from the approved senders list`,
            alertId: 'ADI-BNB-APPROVED-SENDERS-UPDATED',
            severity: FindingSeverity.Critical,
            type: FindingType.Info,
          }),
        )
      }
    })

    return findings
  }
}
