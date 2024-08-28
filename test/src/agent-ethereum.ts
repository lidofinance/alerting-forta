import {
  TransactionEvent,
  Finding,
  FindingType,
} from "forta-agent";

import { EVENTS_OF_NOTICE, CSM_ADDRESS } from "./constants";

export const name = "Forta-Simple-Bot";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleSafeEvents(txEvent, findings);

  return findings;
}

function handleSafeEvents(txEvent: TransactionEvent, findings: Finding[]) {
  if (CSM_ADDRESS in txEvent.addresses) {
    EVENTS_OF_NOTICE.forEach((eventInfo) => {
      const events = txEvent.filterLog(eventInfo.event, CSM_ADDRESS);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(
              txEvent.transaction.hash,
              event.args,
            ),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          }),
        );
      });
    });
  }
}
