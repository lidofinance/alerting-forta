import { elapsedTime } from '../../utils/time'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Logger } from 'winston'
import { either as E } from 'fp-ts'
import { Finding } from '../../generated/proto/alert_pb'

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

    findings.push(...revertedTxFindings, ...rolesChangingFindings)

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

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const ossifiedProxyFindings = handleEventsOfNotice(txEvent, this.ossifiedProxyEvents)
    const burnerFindings = handleEventsOfNotice(txEvent, this.burnerEvents)
    const csFeeDistributorFindings = handleEventsOfNotice(txEvent, this.csFeeDistributorEvents)

    out.push(...ossifiedProxyFindings, ...burnerFindings, ...csFeeDistributorFindings)

    return out
  }
}
