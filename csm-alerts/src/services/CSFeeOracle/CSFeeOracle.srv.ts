import { elapsedTime } from '../../utils/time'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'

export abstract class ICSFeeOracleClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSFeeOracleSrv {
  private readonly name = 'CSFeeOracleSrv'
  private readonly logger: Logger
  private readonly csFeeOracleClient: ICSFeeOracleClient

  private readonly ossifiedProxyEvents: EventOfNotice[]
  private readonly pausableEvents: EventOfNotice[]
  private readonly burnerEvents: EventOfNotice[]
  private readonly hashConsensusEvents: EventOfNotice[]
  private readonly csFeeOracleEvents: EventOfNotice[]

  constructor(
    logger: Logger,
    ethProvider: ICSFeeOracleClient,
    ossifiedProxyEvents: EventOfNotice[],
    pausableEvents: EventOfNotice[],
    burnerEvents: EventOfNotice[],
    hashConsensusEvents: EventOfNotice[],
    csFeeOracleEvents: EventOfNotice[],
  ) {
    this.logger = logger
    this.csFeeOracleClient = ethProvider

    this.ossifiedProxyEvents = ossifiedProxyEvents
    this.pausableEvents = pausableEvents
    this.burnerEvents = burnerEvents
    this.hashConsensusEvents = hashConsensusEvents
    this.csFeeOracleEvents = csFeeOracleEvents
  }

  public async initialize(currentBlock: number): Promise<Finding[] | null | Error> {
    const start = new Date().getTime()

    const currBlock = await this.csFeeOracleClient.getBlockByNumber(currentBlock)
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

    this.logger.info(elapsedTime(CSFeeOracleSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }
  // to be implemented
  handleRolesChanging(blockNumber: number): Promise<Finding[]> {
    const out: Finding = new Finding()
    this.logger.info(`${blockNumber}`)
    return Promise.resolve([out])
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const ossifiedProxyFindings = handleEventsOfNotice(txEvent, this.ossifiedProxyEvents)
    const pausableEventsFindings = handleEventsOfNotice(txEvent, this.pausableEvents)
    const burnerFindings = handleEventsOfNotice(txEvent, this.burnerEvents)
    const hashConsensusFindings = handleEventsOfNotice(txEvent, this.hashConsensusEvents)
    const csFeeOracleFindings = handleEventsOfNotice(txEvent, this.csFeeOracleEvents)

    out.push(
      ...ossifiedProxyFindings,
      ...pausableEventsFindings,
      ...burnerFindings,
      ...hashConsensusFindings,
      ...csFeeOracleFindings,
    )

    return out
  }
}
