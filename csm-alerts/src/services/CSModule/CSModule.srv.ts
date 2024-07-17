import { either as E } from 'fp-ts'
import { EventOfNotice, handleEventsOfNotice, TransactionDto } from '../../entity/events'
import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { BlockDto } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'

export const ETH_10K = 10_000 // 10000 ETH
export const ETH_20K: number = 20_000 // 20000 ETH
export const HOUR_1 = 60 * 60 // 1 hour
export const DAYS_3 = 60 * 60 * 72 // 72 Hours
export const ETH_2 = 2 // 2 ETH

export abstract class ICSModuleClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSModuleSrv {
  private readonly name = 'CSModuleSrv'
  private readonly logger: Logger
  private readonly csModuleClient: ICSModuleClient

  private readonly ossifiedProxyEvents: EventOfNotice[]
  private readonly pausableEvents: EventOfNotice[]
  private readonly burnerEvents: EventOfNotice[]

  constructor(
    logger: Logger,
    csModuleClient: ICSModuleClient,
    ossifiedProxyEvents: EventOfNotice[],
    pausableEvents: EventOfNotice[],
    burnerEvents: EventOfNotice[],
  ) {
    this.logger = logger
    this.csModuleClient = csModuleClient

    this.ossifiedProxyEvents = ossifiedProxyEvents
    this.pausableEvents = pausableEvents
    this.burnerEvents = burnerEvents
  }

  public async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()

    const currBlock = await this.csModuleClient.getBlockByNumber(currentBlock)
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

    this.logger.info(elapsedTime(CSModuleSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }
  // to be implemented
  handleRolesChanging(blockNumber: number): Promise<Finding[]> {
    const out: Finding = new Finding()
    this.logger.info(`${blockNumber}`)
    return Promise.resolve([out])
  }

  handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const ossifiedProxyFindings = handleEventsOfNotice(txEvent, this.ossifiedProxyEvents)
    const pausableEventsFindings = handleEventsOfNotice(txEvent, this.pausableEvents)
    const burnerFindings = handleEventsOfNotice(txEvent, this.burnerEvents)

    out.push(...ossifiedProxyFindings, ...pausableEventsFindings, ...burnerFindings)

    return out
  }
}
