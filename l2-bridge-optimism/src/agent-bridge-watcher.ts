import { TransactionEvent, Finding } from "forta-agent";
import { formatAddress } from "forta-agent/dist/cli/utils";
import { L2_BRIDGE_EVENTS } from "./constants";

export const name = "BridgeWatcher";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleL2BridgeEvents(txEvent, findings);

  return findings;
}

function handleL2BridgeEvents(txEvent: TransactionEvent, findings: Finding[]) {
  L2_BRIDGE_EVENTS.forEach((eventInfo) => {
    if (formatAddress(eventInfo.address) in txEvent.addresses) {
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
