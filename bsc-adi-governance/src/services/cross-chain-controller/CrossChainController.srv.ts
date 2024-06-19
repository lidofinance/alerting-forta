import { Logger } from 'winston'
import { elapsedTime } from '../../utils/time'
import { TransactionEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { either as E } from 'fp-ts'

export abstract class ICRossChainControllerClient {
  public abstract getBridgeAdaptersNamesMap(): Promise<E.Either<Error, Record<string, string | undefined>>>
}

export class CrossChainControllerSrv {
  private readonly logger: Logger
  private readonly name = 'CrossChainController'
  private readonly bscClient: ICRossChainControllerClient
  private readonly crossChainControllerAddress: string
  private readonly transactionReceivedEvent =
    'event TransactionReceived(bytes32 transactionId, bytes32 indexed envelopeId, uint256 indexed originChainId, Transaction transaction, address indexed bridgeAdapter, uint8 confirmations)'
  private adaptersNamesMap: Record<string, string | undefined>

  constructor(logger: Logger, bscClient: ICRossChainControllerClient, crossChainControllerAddress: string) {
    this.logger = logger
    this.bscClient = bscClient
    this.crossChainControllerAddress = crossChainControllerAddress
    this.adaptersNamesMap = {}
  }

  public async initialize(currentBlock: number) {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    const initResult = await this.bscClient.getBridgeAdaptersNamesMap()
    if (E.isLeft(initResult)) {
      throw new Error(`Could not initialize ${this.name}. Cause: ${initResult.left}`)
    }
    this.adaptersNamesMap = initResult.right
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
    const events = txEvent.filterLog(this.transactionReceivedEvent, this.crossChainControllerAddress)

    for (const event of events) {
      const adapterName = this.adaptersNamesMap[event.args.bridgeAdapter] ?? 'Unknown adapter'

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
