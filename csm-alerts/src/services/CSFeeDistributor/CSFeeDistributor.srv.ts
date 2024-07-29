import { elapsedTime } from '../../utils/time'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Logger } from 'winston'
import { either as E } from 'fp-ts'
import { Finding } from '../../generated/proto/alert_pb'
import { DeploymentAddresses, ONE_DAY } from '../../utils/constants.holesky'
import { filterLog } from 'forta-agent'
import { DISTRIBUTION_DATA_UPDATED_EVENT, TRANSFER_SHARES_EVENT } from '../../utils/events/cs_fee_distributor_events'

export abstract class ICSFeeDistributorClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSFeeDistributorSrv {
  private name = `CSFeeDistributorSrv`

  private readonly logger: Logger
  private readonly csFeeDistributorClient: ICSFeeDistributorClient

  private readonly ossifiedProxyEvents: EventOfNotice[]
  private readonly burnerEvents: EventOfNotice[]
  private readonly csFeeDistributorEvents: EventOfNotice[]

  private lastDistributionDataUpdated: number | null = null

  constructor(
    logger: Logger,
    ethProvider: ICSFeeDistributorClient,
    ossifiedProxyEvents: EventOfNotice[],
    burnerEvents: EventOfNotice[],
    csFeeDistributorEvents: EventOfNotice[],
  ) {
    this.logger = logger
    this.csFeeDistributorClient = ethProvider
    this.ossifiedProxyEvents = ossifiedProxyEvents
    this.burnerEvents = burnerEvents
    this.csFeeDistributorEvents = csFeeDistributorEvents
  }

  async initialize(): Promise<Error | null> {
    const start = new Date().getTime()

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

  private updateLastDistributionData(event: EventOfNotice, txEvent: TransactionDto): void {
    if (event.abi === DISTRIBUTION_DATA_UPDATED_EVENT) {
      this.lastDistributionDataUpdated = txEvent.block.timestamp
    }
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const ossifiedProxyFindings = handleEventsOfNotice(txEvent, this.ossifiedProxyEvents)
    const burnerFindings = handleEventsOfNotice(txEvent, this.burnerEvents)
    const csFeeDistributorFindings = handleEventsOfNotice(txEvent, this.csFeeDistributorEvents)
    const transferSharesInvalidReceiverFindings = this.handleTransferSharesInvalidReceiver(txEvent)

    if (csFeeDistributorFindings.length !== 0) {
      this.updateLastDistributionData(this.csFeeDistributorEvents[0], txEvent)
    }

    out.push(
      ...ossifiedProxyFindings,
      ...burnerFindings,
      ...csFeeDistributorFindings,
      ...transferSharesInvalidReceiverFindings,
    )

    return out
  }

  public handleTransferSharesInvalidReceiver(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const transferSharesEvents = filterLog(
      txEvent.logs,
      TRANSFER_SHARES_EVENT,
      DeploymentAddresses.CS_FEE_DISTRIBUTOR_ADDRESS,
    )
    if (transferSharesEvents.length === 0) {
      return []
    }

    for (const event of transferSharesEvents) {
      if (
        event.args.from === DeploymentAddresses.CS_FEE_DISTRIBUTOR_ADDRESS.toLowerCase() &&
        event.args.to !== DeploymentAddresses.CS_ACCOUNTING_ADDRESS.toLowerCase()
      ) {
        const f: Finding = new Finding()
        f.setName(`🟣 CSFeeDistributor: Invalid TransferShares receiver`)
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
