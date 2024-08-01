import { either as E } from 'fp-ts'
import { TransactionDto } from '../../entity/events'
import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { BlockDto } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'

export abstract class ICSModuleClient {
  public abstract getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>>
}

export class CSModuleSrv {
  private readonly name = 'CSModuleSrv'
  private readonly logger: Logger
  private readonly csModuleClient: ICSModuleClient

  constructor(logger: Logger, csModuleClient: ICSModuleClient) {
    this.logger = logger
    this.csModuleClient = csModuleClient
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

    const moduleShareIsCloseToTargetShareFindings = this.handleModuleShareIsCloseToTargetShare(txEvent)

    out.push(...moduleShareIsCloseToTargetShareFindings)

    return out
  }

  // to be implemented
  public handleModuleShareIsCloseToTargetShare(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []
    this.logger.info(`${txEvent.block.timestamp}`)
    return out
  }
}
