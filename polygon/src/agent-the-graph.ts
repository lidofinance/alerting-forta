import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import BILLING_ABI from "./abi/Billing.json";

import {
  BILLING_ADDRESS,
  GRAPH_BALANCE_THRESHOLD,
  LIDO_VAULT_ADDRESS,
  MATIC_DECIMALS,
} from "./constants";

import { ethersProvider } from "./ethers";

export const name = "TheGraph";

// 24 hours
const REPORT_WINDOW_GRAPH_BALANCE = 60 * 60 * 24;
let lastReportedGraphBalance = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];
  await Promise.all([handleLidoGraphBalance(blockEvent, findings)]);
  return findings;
}

async function handleLidoGraphBalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedGraphBalance + REPORT_WINDOW_GRAPH_BALANCE < now) {
    const billing = new ethers.Contract(
      BILLING_ADDRESS,
      BILLING_ABI,
      ethersProvider
    );

    const balance = new BigNumber(
      String(await billing.functions.userBalances(LIDO_VAULT_ADDRESS))
    ).div(MATIC_DECIMALS);

    if (balance.isLessThanOrEqualTo(GRAPH_BALANCE_THRESHOLD)) {
      findings.push(
        Finding.fromObject({
          name: "Low balance of Lido account on The Graph",
          description: `Balance is ${balance.toFixed(2)} GRT. It is too low!`,
          alertId: "LOW-LIDO-GRAPH-BALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Degraded,
          metadata: {
            balance: balance.toFixed(2),
            lido_vault_address: LIDO_VAULT_ADDRESS,
          },
        })
      );
      lastReportedGraphBalance = now;
    }
  }
}
