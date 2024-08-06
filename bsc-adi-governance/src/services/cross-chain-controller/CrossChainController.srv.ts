import { Logger } from 'winston'
import { elapsedTime } from '../../utils/time'
import { TransactionEvent, Finding, FindingSeverity, FindingType, BlockEvent } from 'forta-agent'
import { either as E } from 'fp-ts'
import { filterLogs } from '../../utils/filter_logs'
import { handleEventsOfNotice } from '../../utils/handle_events_of_notice'
import { getCrossChainControllerEvents } from '../../utils/events/cross_chain_controller_events'
import { ENVELOPE_STATE, HOUR_IN_BLOCKS, PERIODICAL_BLOCK_INTERVAL } from '../../utils/constants'
import { networkAlert } from '../../utils/errors'

export abstract class ICRossChainControllerClient {
  public abstract getBridgeAdaptersNamesMap(): Promise<E.Either<Error, Map<string, string>>>
  public abstract getReceivedEnvelopeIds(fromBlock: number, toBlock: number): Promise<E.Either<Error, string[]>>
  public abstract getEnvelopeStateByIds(envelopeIds: string[]): Promise<E.Either<Error, Map<string, number>>>
}

export class CrossChainControllerSrv {
  private readonly logger: Logger
  private readonly name = 'CrossChainController'
  private readonly bscClient: ICRossChainControllerClient
  private readonly crossChainControllerAddress: string
  private readonly transactionReceivedEvent =
    'event TransactionReceived(bytes32 transactionId, bytes32 indexed envelopeId, uint256 indexed originChainId, (uint256,bytes), address indexed bridgeAdapter, uint8 confirmations)'
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

  public async handleBlock(block: BlockEvent): Promise<Finding[]> {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [envelopeDelayFindings] = await Promise.all([this.handleEnvelopeDelay(block)])
    findings.push(...envelopeDelayFindings)

    this.logger.info(elapsedTime(this.name + '.' + this.handleBlock.name, start))
    return findings
  }

  private async handleEnvelopeDelay(block: BlockEvent): Promise<Finding[]> {
    const start = new Date().getTime()
    const out: Finding[] = []

    if (block.blockNumber % PERIODICAL_BLOCK_INTERVAL != 0) {
      return out
    }

    const fromBlock = block.blockNumber - HOUR_IN_BLOCKS - PERIODICAL_BLOCK_INTERVAL
    const fromTo = block.blockNumber - HOUR_IN_BLOCKS

    const envelopeIds = await this.bscClient.getReceivedEnvelopeIds(fromBlock, fromTo)
    if (E.isLeft(envelopeIds)) {
      out.push(
        networkAlert(
          envelopeIds.left as unknown as Error,
          `Error in ${this.name}.${this.handleEnvelopeDelay.name} (uid:da8927ff)`,
          `Could not call ethProvider.getReceivedEnvelopeIds`,
        ),
      )
      return out
    }

    const envelopeStates = await this.bscClient.getEnvelopeStateByIds(envelopeIds.right)
    if (E.isLeft(envelopeStates)) {
      out.push(
        networkAlert(
          envelopeStates.left as unknown as Error,
          `Error in ${this.name}.${this.handleEnvelopeDelay.name} (uid:2ddcc824)`,
          `Could not call ethProvider.getEnvelopeStateByIds`,
        ),
      )
      return out
    }

    envelopeStates.right.forEach((state, id) => {
      if (state === ENVELOPE_STATE.DELIVERED) {
        return
      }
      out.push(
        Finding.fromObject({
          name: '⚠️ BSC a.DI: Message hasn’t achieved a quorum after 1 hour passed',
          description: `Message envelope id - '${id}'`,
          alertId: 'BSC-ADI-MESSAGE-NO-QUORUM-HOUR',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      )
    })

    this.logger.info(elapsedTime(this.name + '.' + this.handleEnvelopeDelay.name, start))
    return out
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
