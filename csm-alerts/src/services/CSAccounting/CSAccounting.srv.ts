import { elapsedTime } from '../../utils/time'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { filterLog } from 'forta-agent'
import { APPROVAL_EVENT } from '../../utils/events/cs_accounting_events'

export abstract class ICSAccountingClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSAccountingSrv {
  private readonly name = 'CSAccountingSrv'
  private readonly logger: Logger
  private readonly csAccountingClient: ICSAccountingClient

  private readonly csAccountingEvents: EventOfNotice[]
  private readonly csAccountingAddress: string
  private readonly stETHAddress: string

  constructor(
    logger: Logger,
    ethProvider: ICSAccountingClient,
    csAccountingEvents: EventOfNotice[],
    csAccountingAddress: string,
    stETHAddress: string,
  ) {
    this.logger = logger
    this.csAccountingClient = ethProvider

    this.csAccountingEvents = csAccountingEvents
    this.csAccountingAddress = csAccountingAddress
    this.stETHAddress = stETHAddress
  }

  public async initialize(currentBlock: number): Promise<Finding[] | Error | null> {
    const start = new Date().getTime()

    const currBlock = await this.csAccountingClient.getBlockByNumber(currentBlock)
    if (E.isLeft(currBlock)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return currBlock.left
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  public getName(): string {
    return this.name
  }

  async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [rolesChangingFindings] = await Promise.all([this.handleRolesChanging(blockDto.number)])

    findings.push(...rolesChangingFindings)

    this.logger.info(elapsedTime(CSAccountingSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }
  // to be implemented
  handleRolesChanging(blockNumber: number): Promise<Finding[]> {
    const out: Finding = new Finding()
    this.logger.info(`${blockNumber}`)
    return Promise.resolve([out])
  }

  public handleStETHApprovalEvents(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const approvalEvents = filterLog(txEvent.logs, APPROVAL_EVENT, this.stETHAddress)
    if (approvalEvents.length === 0) {
      return []
    }

    for (const event of approvalEvents) {
      if (event.args.owner === this.csAccountingAddress) {
        const f: Finding = new Finding()
        f.setName(`🔵 Lido stETH: Approval`)
        f.setDescription(`${event.args.spender} received allowance from ${event.args.owner} to ${event.args.value}`)
        f.setAlertid('STETH-APPROVAL')
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }
    }
    return out
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const csAccountingFindings = handleEventsOfNotice(txEvent, this.csAccountingEvents)
    const stETHApprovalFindings = this.handleStETHApprovalEvents(txEvent)

    out.push(...csAccountingFindings, ...stETHApprovalFindings)

    return out
  }
}
