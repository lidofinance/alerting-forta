import { Logger } from 'winston'
import { elapsedTime } from '../../utils/time'
import { TransactionEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { CROSS_CHAIN_CONTROLLER_ADDRESS } from '../../utils/constants'

export abstract class ICRossChainControllerClient {
  public abstract getAdapterName(address: string): Promise<string>
}

export class CrossChainControllerSrv {
  private readonly logger: Logger
  private readonly name = 'CrossChainController'
  private readonly bscClient: ICRossChainControllerClient

  private readonly transactionReceivedEvent =
    'event TransactionReceived(bytes32 transactionId, bytes32 indexed envelopeId, uint256 indexed originChainId, Transaction transaction, address indexed bridgeAdapter, uint8 confirmations)'

  constructor(logger: Logger, bscClient: ICRossChainControllerClient) {
    this.logger = logger
    this.bscClient = bscClient
  }

  public initialize(currentBlock: number): null {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleTransaction(txEvent: TransactionEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const messageReceivedFindings = await this.handleMessageReceived(txEvent)

    findings.push(...messageReceivedFindings)

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleTransaction.name, start))
    return findings
  }

  public async handleMessageReceived(txEvent: TransactionEvent) {
    const findings: Finding[] = []
    const events = txEvent.filterLog(this.transactionReceivedEvent, CROSS_CHAIN_CONTROLLER_ADDRESS)

    for (const event of events) {
      const adapterName = await this.bscClient.getAdapterName(event.args.bridgeAdapter)

      findings.push(
        Finding.fromObject({
          name: `ℹ️ BSC a.DI: Message received by the ${adapterName}`,
          description: `CrossChainController received a message from ${event.args.bridgeAdapter} (${adapterName})`,
          alertId: 'BSC-ADI-MESSAGE-RECEIVED',
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          metadata: { args: String(event.args) },
        }),
      )
    }

    return findings
  }
}
