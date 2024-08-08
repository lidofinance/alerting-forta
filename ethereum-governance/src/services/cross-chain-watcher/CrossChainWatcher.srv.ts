import { Logger } from 'winston'
import { elapsedTime } from '../../shared/time'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { ICrossChainClient } from './contract'
import { BlockEvent, Finding } from 'forta-agent'
import { handleBridgeBalance, handleTransactionForwardingAttempt } from './handlers'
import * as E from 'fp-ts/Either'

export class CrossChainWatcherSrv {
  private readonly logger: Logger
  private readonly name = 'CrossChainWatcher'
  private readonly ethProvider
  private bscAdapters: Map<string, string> = new Map()

  constructor(logger: Logger, ethProvider: ICrossChainClient) {
    this.logger = logger
    this.ethProvider = ethProvider
  }

  public async initialize(currentBlock: number) {
    const start = new Date().getTime()

    const bscAdapters = await this.ethProvider.getBSCForwarderBridgeAdapterNames()
    if (E.isRight(bscAdapters)) {
      this.bscAdapters = bscAdapters.right
    } else {
      console.warn(
        `Error fetching BSC forwarder bridge adapter names: ${bscAdapters.left.message}. Adapter names substitutions will not be available.`,
      )
    }

    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(block: BlockEvent): Promise<Finding[]> {
    return await handleBridgeBalance(block)
  }

  public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
    return await handleTransactionForwardingAttempt(txEvent, this.bscAdapters)
  }
}
