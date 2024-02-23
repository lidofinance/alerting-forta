import { TransactionEvent, Finding, FindingType } from "forta-agent";
import { EventsOfNotice, SafeTX } from "./utils";

export class GnosisSafeFortaHandler {
  constructor(
    public readonly safeAddress: string,
    public safeName: string,
  ) {}

  public async handleTransaction(
    txEvent: TransactionEvent,
    eventInfo: EventsOfNotice,
  ): Promise<Finding[]> {
    const findings: Finding[] = [];

    const events = txEvent.filterLog(eventInfo.event, this.safeAddress);
    for (const event of events) {
      const safeTx: SafeTX = {
        tx: txEvent.transaction.hash,
        safeAddress: this.safeAddress,
        safeName: this.safeName,
        safeTx: event.args.txHash || "",
      };
      findings.push(
        Finding.fromObject({
          name: eventInfo.name,
          description: eventInfo.description(safeTx, event.args),
          alertId: eventInfo.alertId,
          severity: eventInfo.severity,
          type: FindingType.Info,
          metadata: { args: String(event.args) },
        }),
      );
    }

    return findings;
  }
}
