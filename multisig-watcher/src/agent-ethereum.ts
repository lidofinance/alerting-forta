import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { GNOSIS_SAFE_EVENTS_OF_NOTICE, SAFES_ETH } from "./constants";

export const name = "Ethereum-multisig-watcher";

export async function initialize(
  currentBlock: number
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
  SAFES_ETH.forEach(([safeAddress, safeName]) => {
    if (safeAddress in txEvent.addresses) {
      GNOSIS_SAFE_EVENTS_OF_NOTICE.forEach((eventInfo) => {
        const events = txEvent.filterLog(eventInfo.event, safeAddress);
        events.forEach((event) => {
          findings.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(
                `${safeName} (${safeAddress})`,
                event.args
              ),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: FindingType.Info,
              metadata: { args: String(event.args) },
            })
          );
        });
      });
    }
  });
}
