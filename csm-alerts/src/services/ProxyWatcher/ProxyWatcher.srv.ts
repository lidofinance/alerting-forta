import { elapsedTime } from '../../utils/time'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto, EventOfNotice, TransactionDto, handleEventsOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'

export abstract class IProxyWatcherClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class ProxyWatcherSrv {
  private readonly name = 'ProxyWatcherSrv'
  private readonly logger: Logger
  private readonly proxyWatcherClient: IProxyWatcherClient

  private readonly ossifiedProxyEvents: EventOfNotice[]
  private readonly pausableEvents: EventOfNotice[]
  private readonly burnerEvents: EventOfNotice[]

  constructor(
    logger: Logger,
    ethProvider: IProxyWatcherClient,
    ossifiedProxyEvents: EventOfNotice[],
    pausableEvents: EventOfNotice[],
    burnerEvents: EventOfNotice[],
  ) {
    this.logger = logger
    this.proxyWatcherClient = ethProvider

    this.ossifiedProxyEvents = ossifiedProxyEvents
    this.pausableEvents = pausableEvents
    this.burnerEvents = burnerEvents
  }

  public async initialize(currentBlock: number): Promise<Finding[] | null | Error> {
    const start = new Date().getTime()

    const currBlock = await this.proxyWatcherClient.getBlockByNumber(currentBlock)
    if (E.isLeft(currBlock)) {
      this.logger.error(elapsedTime(`Failed [${this.name}.initialize]`, start))
      return currBlock.left
    }
    this.logger.info(elapsedTime(`[${this.name}.initialize]`, start))
    return null
  }

  async handleBlock(blockDto: BlockDto): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    this.logger.info(`${blockDto.number}`)
    this.logger.info(elapsedTime(ProxyWatcherSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []

    const ossifiedProxyFindings = handleEventsOfNotice(txEvent, this.ossifiedProxyEvents)
    const pausableEventsFindings = handleEventsOfNotice(txEvent, this.pausableEvents)
    const burnerFindings = handleEventsOfNotice(txEvent, this.burnerEvents)

    out.push(...ossifiedProxyFindings, ...pausableEventsFindings, ...burnerFindings)

    return out
  }
}
