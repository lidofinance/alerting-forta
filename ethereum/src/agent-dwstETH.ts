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
  DWSTETH_TOKEN_ADDRESS,
  ETH_DECIMALS,
  TRANSFER_EVENT,
} from "./constants";

export const name = "dwstETH monitor";

type IMintRecord = {
  time: number;
  amount: BigNumber;
};

// 1 hour
const REPORT_WINDOW_TO_MANY_MINTS = 60 * 60;
// 1 hour
const MINTS_MONITORING_WINDOW = 60 * 60;

// 2000 dwstETH
const MAX_MINTS_SUM = new BigNumber(2000).times(ETH_DECIMALS);

// 1000 dwstETH
const MAX_SINGLE_TX_MINT = new BigNumber(1000).times(ETH_DECIMALS);

let lastReportedToManyMints = 0;
let mintsCache: IMintRecord[] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleToManyMints(blockEvent, findings)]);

  console.log(mintsCache);
  return findings;
}

async function handleToManyMints(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  // remove old withdrawals records
  mintsCache = mintsCache.filter(
    (x: IMintRecord) => x.time > now - MINTS_MONITORING_WINDOW
  );
  if (lastReportedToManyMints + REPORT_WINDOW_TO_MANY_MINTS < now) {
    let mintsSum = new BigNumber(0);
    mintsCache.forEach(
      (x: IMintRecord) => (mintsSum = mintsSum.plus(x.amount))
    );
    if (mintsSum.isGreaterThanOrEqualTo(MAX_MINTS_SUM)) {
      findings.push(
        Finding.fromObject({
          name: "High amount of dwstETH minted",
          description:
            `There were ${mintsSum.div(ETH_DECIMALS).toFixed(2)} ` +
            `dwstETH minted during the last ${Math.floor(
              MINTS_MONITORING_WINDOW / (60 * 60)
            )} hour(s)`,
          alertId: "HIGH-DWSTETH-MINTS-SUM",
          severity: FindingSeverity.Info,
          type: FindingType.Suspicious,
        })
      );
      lastReportedToManyMints = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleWithdrawalEvent(txEvent, findings);

  return findings;
}

function handleWithdrawalEvent(txEvent: TransactionEvent, findings: Finding[]) {
  if (DWSTETH_TOKEN_ADDRESS in txEvent.addresses) {
    const [event] = txEvent.filterLog(TRANSFER_EVENT, DWSTETH_TOKEN_ADDRESS);
    if (
      event &&
      event.args._from == "0x0000000000000000000000000000000000000000"
    ) {
      const amount = new BigNumber(String(event.args._value));
      console.log(`Minted: ${amount.toFixed()}`);
      if (amount.isGreaterThanOrEqualTo(MAX_SINGLE_TX_MINT)) {
        findings.push(
          Finding.fromObject({
            name: "High amount of dwstETH minted in single TX",
            description:
              `There were ${amount.div(ETH_DECIMALS).toFixed(2)} ` +
              `dwstETH minted in single TX`,
            alertId: "HIGH-DWSTETH-MINT-SINGLE-TX",
            severity: FindingSeverity.Info,
            type: FindingType.Suspicious,
          })
        );
      }
      mintsCache.push({
        time: txEvent.timestamp,
        amount: amount,
      });
    }
  }
}
