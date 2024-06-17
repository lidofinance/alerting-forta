import { Logger } from 'winston'

import { Finding, FindingSeverity, FindingType, TransactionEvent } from 'forta-agent'
import { elapsedTime } from '../../utils/time'
import { getUniqueKey } from '../../utils/finding.helpers'
import { etherscanAddress } from '../../utils/string'

export class CrossChainForwarderSrv {
  private readonly logger: Logger
  private readonly name = 'CrossChainForwarderSrv'
  private readonly crossChainForwarderAddress: string
  private readonly senderUpdatedEvent: string = 'event SenderUpdated(address indexed sender, bool indexed isApproved)'

  constructor(logger: Logger, crossChainForwarderAddress: string) {
    this.logger = logger
    this.crossChainForwarderAddress = crossChainForwarderAddress
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
    const findings: Finding[] = []
    const start = new Date().getTime()

    const filteredEvents = txEvent.filterLog(this.senderUpdatedEvent, this.crossChainForwarderAddress)

    const uniqueKey = 'cdf565c5-50c9-48e2-9932-3f74470e4aa5'

    for (const event of filteredEvents) {
      findings.push(
        Finding.fromObject({
          name: '🚨🚨🚨 BNB a.DI: Approved sender changed',
          description: event.args.isApproved
            ? `Address ${etherscanAddress(event.args.address)} was set as an approved sender`
            : `Address ${etherscanAddress(event.args.address)} was removed from the approved senders list`,
          alertId: 'BNB-ADI-APPROVED-SENDER-UPDATED',
          severity: FindingSeverity.Critical,
          type: FindingType.Info,
          metadata: { args: String(event.args) },
          uniqueKey: getUniqueKey(uniqueKey, txEvent.blockNumber),
        }),
      )
    }

    this.logger.debug(elapsedTime(CrossChainForwarderSrv.name + '.' + this.handleTransaction.name, start))

    return findings
  }
}
