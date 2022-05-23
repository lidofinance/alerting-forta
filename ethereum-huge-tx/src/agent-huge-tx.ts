import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
  LogDescription,
} from "forta-agent";

import {
  MONITORED_TOKENS,
  ETH_DECIMALS,
  TRANSFER_EVENT,
  TX_AMOUNT_THRESHOLD,
  ADDRESS_TO_NAME,
  NULL_ADDRESS,
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
  let transfersTexts: string[] = [];
  Object.entries(MONITORED_TOKENS).map(async (keyValue: string[]) => {
    const [tokenName, tokenAddress] = keyValue;
    if (tokenAddress in txEvent.addresses) {
      const transferEvents = txEvent.filterLog(TRANSFER_EVENT, tokenAddress);
      transferEvents.forEach((event) => {
        const transferText = prepareTransferEventText(event, tokenName);
        if (transferText) {
          transfersTexts.push(transferText);
        }
      });
    }
  });
  if (transfersTexts.length > 0) {
    findings.push(
      Finding.fromObject({
        name: "Huge token(s) of Lido interest in a single TX",
        description:
          transfersTexts.join("\n") + `\nhttps://etherscan.io/tx/${txEvent.hash}`,
        alertId: "HUGE-TOKEN-TRANSFERS-IN-SINGLE-TX",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
  }
}

function prepareTransferEventText(transferEvent: LogDescription, tokenName: string) {
  if (transferEvent.args._value) {
    const amount = new BigNumber(String(transferEvent.args._value)).div(
      ETH_DECIMALS
    );
    if (amount.isGreaterThanOrEqualTo(TX_AMOUNT_THRESHOLD)) {
      const from = transferEvent.args._from.toLowerCase();
      const fromName = ADDRESS_TO_NAME.get(from) || "unknown";
      const to = transferEvent.args._to.toLowerCase();
      const toName = ADDRESS_TO_NAME.get(to) || "unknown";
      if (from == NULL_ADDRESS) {
        return (
          `**${amount.toFixed(2)} ${tokenName}** ` +
          `were minted.\n` +
          `To: ${to} (${toName})`
        );
      }
      if (to == NULL_ADDRESS) {
        return (
          `**${amount.toFixed(2)} ${tokenName}** ` +
          `were burned.\n` +
          `From: ${from} (${fromName})`
        );
      }
      return (
        `**${amount.toFixed(2)} ${tokenName}** ` +
        `were transferred.\n` +
        `From: ${from} (${fromName})\n` +
        `To: ${to} (${toName})`
      );
    }
  }
}
