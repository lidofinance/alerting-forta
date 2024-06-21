import { Finding, TransactionEvent } from 'forta-agent'
import { EventOfNotice } from '../../utils/constants'
import { Logger } from 'winston'
import { elapsedTime } from '../../utils/time'
import { handleEventsOfNotice } from '../../utils/handle_events_of_notice'

export class EventWatcherSrv {
  private readonly name: string
  private readonly eventsOfNotice: EventOfNotice[]
  private readonly logger: Logger

  constructor(botName: string, events: EventOfNotice[], logger: Logger) {
    this.name = botName
    this.eventsOfNotice = events
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionEvent): Finding[] {
    const start = new Date().getTime()

    const findings = handleEventsOfNotice(txEvent, this.eventsOfNotice)

    this.logger.info(elapsedTime(this.getName() + '.' + this.handleTransaction.name, start))
    return findings
  }
}
