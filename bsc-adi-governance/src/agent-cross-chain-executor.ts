import { TransactionEvent, Finding } from "forta-agent";
import { CROSS_CHAIN_EXECUTOR_EVENTS } from "./constants";

export const name = "CrossChainExecutorBot";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleCrossChainExecutorEvents(txEvent, findings);

  return findings;
}

function handleCrossChainExecutorEvents(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  CROSS_CHAIN_EXECUTOR_EVENTS.forEach((eventInfo) => {
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
          })
        );
      });
    }
  });
}
