import { Logger } from 'winston'
import { Finding, FindingType, TransactionEvent } from 'forta-agent'
import { NetworkError } from '../../shared/errors'
import { elapsedTime } from '../../shared/time'
import { GNOSIS_SAFE_EVENTS_OF_NOTICE, MELLOW_VAULT_ADMIN_MULTISIGS, SafeTX } from 'constants/common'

const safes = MELLOW_VAULT_ADMIN_MULTISIGS

export class MultisigWatcherSrv {
  private readonly logger: Logger
  private readonly name = 'MultisigWatcherSrv'

  constructor(logger: Logger) {
    this.logger = logger
  }

  async initialize(blockNumber: number): Promise<NetworkError | null> {
    const start = new Date().getTime()

    this.logger.info(elapsedTime(MultisigWatcherSrv.name + '.' + this.initialize.name, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public handleTransaction(txEvent: TransactionEvent): Finding[] {
    const findings: Finding[] = []

    const handleSafeEventsFindings = this.handleSafeEvents(txEvent)
    findings.push(...handleSafeEventsFindings)

    return findings
  }

  private handleSafeEvents(txEvent: TransactionEvent): Finding[] {
    const out: Finding[] = []
    safes.forEach(([safeAddress, safeName]) => {
      if (safeAddress.toLowerCase() in txEvent.addresses) {
        GNOSIS_SAFE_EVENTS_OF_NOTICE.forEach((eventInfo) => {
          const events = txEvent.filterLog(eventInfo.event, safeAddress)
          events.forEach((event) => {
            const safeTx: SafeTX = {
              tx: txEvent.transaction.hash,
              safeAddress: safeAddress,
              safeName: safeName,
              safeTx: event.args.txHash || '',
            }
            out.push(
              Finding.fromObject({
                name: eventInfo.name,
                description: eventInfo.description(safeTx, event.args),
                alertId: eventInfo.alertId,
                severity: eventInfo.severity,
                type: FindingType.Info,
                metadata: { args: String(event.args) },
              }),
            )
          })
        })
      }
    })

    return out
  }
}
