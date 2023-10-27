import { TransactionEvent, Finding } from "forta-agent";
import { L2_BRIDGE_EVENTS } from "./constants";
import { TransactionEventHelper } from "./entity/transactionEvent";
import { Log } from "@ethersproject/abstract-provider";

export const name = "BridgeWatcher";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(logs: Log[]) {
  const findings: Finding[] = [];

  handleL2BridgeEvents(logs, findings);

  return findings;
}

function handleL2BridgeEvents(logs: Log[], findings: Finding[]) {
  const addresses = logs.map((log) => log.address);

  L2_BRIDGE_EVENTS.forEach((eventInfo) => {
    if (eventInfo.address in addresses) {
      const events = TransactionEventHelper.filterLog(
        logs,
        eventInfo.event,
        eventInfo.address,
      );
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
