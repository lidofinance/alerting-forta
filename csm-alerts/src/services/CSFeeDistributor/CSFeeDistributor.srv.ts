import { elapsedTime } from '../../utils/time'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Logger } from 'winston'
import { either as E } from 'fp-ts'
import { Finding } from '../../generated/proto/alert_pb'
import { ONE_DAY } from '../../utils/constants'
import { filterLog } from 'forta-agent'
import { DISTRIBUTION_DATA_UPDATED_EVENT, TRANSFER_SHARES_EVENT } from '../../utils/events/cs_fee_distributor_events'

export abstract class ICSFeeDistributorClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSFeeDistributorSrv {
  private name = `CSFeeDistributorSrv`

  private readonly logger: Logger
  private readonly csFeeDistributorClient: ICSFeeDistributorClient

  private readonly csFeeDistributorEvents: EventOfNotice[]
  private readonly csAccountingAddress: string
  private readonly csFeeDistributorAddress: string
  private readonly stETHAddress: string

  private lastDistributionDataUpdated: number | null = 0

  constructor(
    logger: Logger,
    ethProvider: ICSFeeDistributorClient,
    csFeeDistributorEvents: EventOfNotice[],
    csAccountingAddress: string,
    csFeeDistributorAddress: string,
    stETHAddress: string,
  ) {
    this.logger = logger
    this.csFeeDistributorClient = ethProvider
    this.csFeeDistributorEvents = csFeeDistributorEvents
    this.csAccountingAddress = csAccountingAddress
    this.csFeeDistributorAddress = csFeeDistributorAddress
    this.stETHAddress = stETHAddress
  }

  async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    const currBlock = await this.csFeeDistributorClient.getBlockByNumber(currentBlock)
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

    const [revertedTxFindings, rolesChangingFindings] = await Promise.all([
      this.handleRevertedTx(blockDto.number),
      this.handleRolesChanging(blockDto.number),
    ])
    const distributionDataUpdatedFindings = this.checkDistributionDataUpdated(blockDto)

    findings.push(...revertedTxFindings, ...rolesChangingFindings, ...distributionDataUpdatedFindings)

    this.logger.info(elapsedTime(CSFeeDistributorSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }
  // to be implemented
  handleRolesChanging(blockNumber: number): Promise<Finding[]> {
    const out: Finding = new Finding()
    this.logger.info(`${blockNumber}`)
    return Promise.resolve([out])
  }
  // to be implemented
  handleRevertedTx(blockNumber: number): Promise<Finding[]> {
    const out: Finding = new Finding()
    this.logger.info(`${blockNumber}`)
    return Promise.resolve([out])
  }

  private checkDistributionDataUpdated(blockDto: BlockDto): Finding[] {
    const out: Finding[] = []
    const now = blockDto.timestamp

    if (this.lastDistributionDataUpdated && now - this.lastDistributionDataUpdated > ONE_DAY) {
      const daysSinceLastUpdate = Math.floor((now - this.lastDistributionDataUpdated) / ONE_DAY)
      const f = new Finding()
      f.setName(`🔴 CSFeeDistributor: No DistributionDataUpdated Event`)
      f.setDescription(`There has been no DistributionDataUpdated event for ${daysSinceLastUpdate} days.`)
      f.setAlertid('CSFEE-NO-DISTRIBUTION-DATA-UPDATED')
      f.setSeverity(Finding.Severity.HIGH)
      f.setType(Finding.FindingType.DEGRADED)
      f.setProtocol('ethereum')
      out.push(f)
    }
    return out
  }

  private updateLastDistributionData(txEvent: TransactionDto): void {
    const distributionDataUpdatedEvents = filterLog(
      txEvent.logs,
      DISTRIBUTION_DATA_UPDATED_EVENT,
      this.csFeeDistributorAddress,
    )

    if (distributionDataUpdatedEvents.length !== 0) {
      this.lastDistributionDataUpdated = txEvent.block.timestamp
    }
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const csFeeDistributorFindings = handleEventsOfNotice(txEvent, this.csFeeDistributorEvents)
    const transferSharesInvalidReceiverFindings = this.handleTransferSharesInvalidReceiver(txEvent)

    if (csFeeDistributorFindings.length !== 0) {
      this.updateLastDistributionData(txEvent)
    }

    out.push(...csFeeDistributorFindings, ...transferSharesInvalidReceiverFindings)

    return out
  }

  public handleTransferSharesInvalidReceiver(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const transferSharesEvents = filterLog(txEvent.logs, TRANSFER_SHARES_EVENT, this.stETHAddress)
    if (transferSharesEvents.length === 0) {
      return []
    }

    for (const event of transferSharesEvents) {
      if (
        event.args.from === this.csFeeDistributorAddress.toLowerCase() &&
        event.args.to !== this.csAccountingAddress.toLowerCase()
      ) {
        const f: Finding = new Finding()
        f.setName(`🚨 CSFeeDistributor: Invalid TransferShares receiver`)
        f.setDescription(
          `TransferShares from CSFeeDistributor to an invalid address ${event.args.to} (expected CSAccounting)`,
        )
        f.setAlertid('CSFEE-DISTRIBUTOR-INVALID-TRANSFER')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        out.push(f)
      }
    }
    return out
  }
}
