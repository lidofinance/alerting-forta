import { Logger } from 'winston'
import { elapsedTime } from '../../utils/time'
import { TransactionEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { either as E } from 'fp-ts'
import { filterLogs } from '../../utils/filter_logs'
import { handleEventsOfNotice } from '../../utils/handle_events_of_notice'
import { getCrossChainControllerEvents } from '../../utils/events/cross_chain_controller_events'

export abstract class ICRossChainControllerClient {
  public abstract getBridgeAdaptersNamesMap(): Promise<E.Either<Error, Map<string, string>>>
}

export class CrossChainControllerSrv {
  private readonly logger: Logger
  private readonly name = 'CrossChainController'
  private readonly bscClient: ICRossChainControllerClient
  private readonly crossChainControllerAddress: string
  private readonly transactionReceivedEvent =
    'event TransactionReceived(bytes32 transactionId, bytes32 indexed envelopeId, uint256 indexed originChainId, Transaction transaction, address indexed bridgeAdapter, uint8 confirmations)'
  private adaptersNamesMap: Map<string, string>

  constructor(logger: Logger, bscClient: ICRossChainControllerClient, crossChainControllerAddress: string) {
    this.logger = logger
    this.bscClient = bscClient
    this.crossChainControllerAddress = crossChainControllerAddress
    this.adaptersNamesMap = new Map()
  }

  public async initialize(currentBlock: number): Promise<Error | null> {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    const initResult = await this.bscClient.getBridgeAdaptersNamesMap()
    if (E.isLeft(initResult)) {
      return initResult.left
    }

    this.adaptersNamesMap = initResult.right

    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleTransaction(txEvent: TransactionEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const messageReceivedFindings = await this.handleMessageReceived(txEvent)
    const eventsFindings = handleEventsOfNotice(
      txEvent,
      getCrossChainControllerEvents(this.crossChainControllerAddress),
    )

    findings.push(...messageReceivedFindings, ...eventsFindings)

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleTransaction.name, start))
    return findings
  }

  public async handleMessageReceived(txEvent: TransactionEvent) {
    const findings: Finding[] = []
    const events = filterLogs(txEvent, this.transactionReceivedEvent, this.crossChainControllerAddress)

    for (const event of events) {
      const adapterName = this.adaptersNamesMap.has(event.args.bridgeAdapter)
        ? this.adaptersNamesMap.get(event.args.bridgeAdapter)
        : 'Unknown adapter'

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
