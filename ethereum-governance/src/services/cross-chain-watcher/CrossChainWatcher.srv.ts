import { Logger } from 'winston'
import { elapsedTime } from '../../shared/time'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { CrossChainClient } from './contract'
import { BlockEvent, Finding } from 'forta-agent'

export class CrossChainWatcherSrv {
  private readonly logger: Logger
  private readonly name = 'CrossChainWatcher'
  private readonly ethProvider

  constructor(logger: Logger, ethProvider: CrossChainClient) {
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

  public async handleBlock(block: BlockEvent): Promise<Finding[]> {
    return []
  }

  public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
    return []
  }
}
