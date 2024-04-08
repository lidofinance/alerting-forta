import { elapsedTime } from '../../utils/time'
import { Logger } from 'winston'
import { handleEventsOfNotice } from '../../utils/notice'

import { Finding, TransactionEvent } from 'forta-agent'

import { TRP_EVENTS_OF_NOTICE } from '../../utils/events/trp_changes'

export class TrpChangesSrv {
  private readonly logger: Logger
  private readonly name = 'TrpChangesSrv'

  constructor(logger: Logger) {
    this.logger = logger
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

    const findingsEventsOfNotice = handleEventsOfNotice(txEvent, TRP_EVENTS_OF_NOTICE)

    findings.push(...findingsEventsOfNotice)
    this.logger.info(elapsedTime(TrpChangesSrv.name + '.' + this.handleTransaction.name, start))

    return findings
  }
}
