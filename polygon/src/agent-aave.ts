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
  APOLSTMATIC_ADDRES,
  AAVE_BURN_EVENT,
  AAVE_MINT_EVENT,
  AAVE_MINT_BURN_THRESHOLD,
  MATIC_DECIMALS,
} from "./constants";

export const name = "AAVE";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleAaveTransaction(txEvent, findings);

  return findings;
}

function handleAaveTransaction(txEvent: TransactionEvent, findings: Finding[]) {
  if (APOLSTMATIC_ADDRES in txEvent.addresses) {
    const mint_events = txEvent.filterLog(AAVE_MINT_EVENT, APOLSTMATIC_ADDRES);
    mint_events.forEach((event) => {
      const value = new BigNumber(String(event.args.value)).div(MATIC_DECIMALS);
      if (value.gte(AAVE_MINT_BURN_THRESHOLD)) {
        findings.push(
          Finding.fromObject({
            name: "😱 Huge amount supplied to AAVE",
            description: `**${value.toFixed(
              2
            )} stMATIC** were supplied to AAVE`,
            alertId: "HUGE-AAVE-TX",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
        );
      }
    });
    const burn_events = txEvent.filterLog(AAVE_BURN_EVENT, APOLSTMATIC_ADDRES);
    burn_events.forEach((event) => {
      const value = new BigNumber(String(event.args.value)).div(MATIC_DECIMALS);
      if (value.gte(AAVE_MINT_BURN_THRESHOLD)) {
        findings.push(
          Finding.fromObject({
            name: "🤔 Huge amount withdrawn from AAVE",
            description: `**${value.toFixed(
              2
            )} stMATIC** were withdrawn from AAVE`,
            alertId: "HUGE-AAVE-TX",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
        );
      }
    });
  }
}
