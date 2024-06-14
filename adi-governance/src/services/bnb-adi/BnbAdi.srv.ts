import { BlockEvent, Finding, FindingSeverity, FindingType, LogDescription, TransactionEvent } from 'forta-agent'
import { etherscanAddress } from '../../utils/string'
import * as E from 'fp-ts/Either'
import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { networkAlert } from '../../utils/errors'
import { SENDER_UPDATED_EVENT } from 'src/utils/events/cross_chain_controller_events'
import { ADI_CROSS_CHAIN_CONTROLLER, ARAGON_AGENT_ADDRESS } from 'src/utils/constants'

export interface IBnbAdiEthClient {
  isSenderApproved: (address: string, blockNumber: number) => Promise<E.Either<Error, boolean>>
}
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

    const isSenderApproved = await this.ethProvider.isSenderApproved(ARAGON_AGENT_ADDRESS, blockEvent.blockNumber)

    if (E.isLeft(isSenderApproved)) {
      findings.push(
        networkAlert(
          isSenderApproved.left,
          `Error in ${BnbAdiSrv.name}.${this.handleApprovedSender.name}`,
          `Could not call thProvider.isSenderApproved for address - ${ARAGON_AGENT_ADDRESS}`,
        ),
      )
    } else if (!isSenderApproved.right) {
      findings.push(
        Finding.fromObject({
          name: `🚨🚨🚨 BNB a.DI: Approved sender (DAO Agent) changed`,
          description:
            `Address ${etherscanAddress(ARAGON_AGENT_ADDRESS)} is not an approved sender anymore.` +
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

    const senderUpdatedEvents = txEvent.filterLog(SENDER_UPDATED_EVENT, ADI_CROSS_CHAIN_CONTROLLER)
    senderUpdatedEvents.sort(byLogIndexAsc)

    senderUpdatedEvents.forEach((event) => {
      if (event.args.address?.toLowerCase() !== ARAGON_AGENT_ADDRESS) {
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
