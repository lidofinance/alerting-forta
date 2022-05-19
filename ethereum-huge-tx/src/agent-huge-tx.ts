import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import {
  MONITORED_TOKENS,
  ETH_DECIMALS,
  TRANSFER_EVENT,
  TX_AMOUNT_THRESHOLD,
  ADDRESS_TO_NAME,
} from "./constants";

export const name = "Huge TX detector";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  await Promise.all([handleHugeTx(txEvent, findings)]);
  return findings;
}

async function handleHugeTx(txEvent: TransactionEvent, findings: Finding[]) {
  Object.entries(MONITORED_TOKENS).map(async (keyValue: string[]) => {
    const [name, address] = keyValue;
    if (address in txEvent.addresses) {
      const [transferEvent] = txEvent.filterLog(TRANSFER_EVENT, address);
      if (transferEvent && transferEvent.args._value) {
        const amount = new BigNumber(String(transferEvent.args._value)).div(
          ETH_DECIMALS
        );
        const from = transferEvent.args._from.toLowerCase();
        const fromName = ADDRESS_TO_NAME.get(from) || "unknown";
        const to = transferEvent.args._to.toLowerCase();
        const toName = ADDRESS_TO_NAME.get(to) || "unknown";
        if (amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD)) {
          findings.push(
            Finding.fromObject({
              name: `Huge ${name} TX`,
              description:
                `**${amount.toFixed(2)} ${name}** ` +
                `were transferred in a single TX.\n` +
                `https://etherscan.io/tx/${txEvent.hash}\n` +
                `From: ${from} (${fromName})\n` +
                `To: ${to} (${toName})`,
              alertId: `HUGE-${name.toUpperCase().replace("_", "-")}-TX`,
              severity: FindingSeverity.Info,
              type: FindingType.Info,
              metadata: { args: String(transferEvent.args) },
            })
          );
        }
      }
    }
  });
}
