import { Finding, TransactionEvent } from "forta-agent";
import { L1_BRIDGE_EVENTS } from "../../constants";

export function handleL1BridgeTransactionEvents(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  L1_BRIDGE_EVENTS.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: eventInfo.type,
            metadata: { args: String(event.args) },
          }),
        );
      });
    }
  });
}
