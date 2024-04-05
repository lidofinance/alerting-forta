import { formatAddress } from "forta-agent/dist/cli/utils";
import {
  TransactionEvent,
  Finding,
} from "forta-agent";
import { GOV_BRIDGE_EVENTS } from "./constants";

export const name = "GovBridgeBot";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleGovBridgeEvents(txEvent, findings);

  return findings;
}

function handleGovBridgeEvents(txEvent: TransactionEvent, findings: Finding[]) {
  GOV_BRIDGE_EVENTS.forEach((eventInfo) => {
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
