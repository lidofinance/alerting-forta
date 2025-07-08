import { Logger } from 'winston'
import { Finding } from 'forta-agent'
import { elapsedTime } from '../../shared/time'
import { MELLOW_VAULT_ADMIN_MULTISIGS } from 'constants/common'
import { MSIG_EVENTS, safeNotices } from '../../utils/events/safe_events'
import { handleEventsOfNotice } from '../../shared/notice'
import { TransactionDto } from '../../entity/events'
const safes = MELLOW_VAULT_ADMIN_MULTISIGS

export class MultisigWatcherSrv {
  private readonly logger: Logger
  private readonly name = 'MultisigWatcherSrv'

  constructor(logger: Logger) {
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionDto): Finding[] {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const handleSafeEventsFindings = this.handleSafeEvents(txEvent)
    findings.push(...handleSafeEventsFindings)

    this.logger.info(elapsedTime(this.name + '.' + this.handleTransaction.name, start))
    return findings
  }

  private handleSafeEvents(txEvent: TransactionDto): Finding[] {
    const out: Finding[] = []
    safes.forEach(([safeAddress]) => {
      const findings = handleEventsOfNotice(txEvent, MSIG_EVENTS, safeAddress, safeNotices)
      out.push(...findings)
    })

    return out
  }
}
