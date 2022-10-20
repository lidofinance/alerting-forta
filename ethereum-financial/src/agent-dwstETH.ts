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
const REPORT_WINDOW_TOO_MANY_MINTS = 60 * 60;
// 1 hour
const MINTS_MONITORING_WINDOW = 60 * 60;

// 10000 dwstETH
const MAX_MINTS_SUM = new BigNumber(10000).times(ETH_DECIMALS);

let lastReportedTooManyMints = 0;
let mintsCache: IMintRecord[] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleTooManyMints(blockEvent, findings)]);

  return findings;
}

async function handleTooManyMints(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  // remove old withdrawals records
  mintsCache = mintsCache.filter(
    (x: IMintRecord) => x.time > now - MINTS_MONITORING_WINDOW
  );
  if (lastReportedTooManyMints + REPORT_WINDOW_TOO_MANY_MINTS < now) {
    let mintsSum = new BigNumber(0);
    mintsCache.forEach(
      (x: IMintRecord) => (mintsSum = mintsSum.plus(x.amount))
    );
    if (mintsSum.isGreaterThanOrEqualTo(MAX_MINTS_SUM)) {
      findings.push(
        Finding.fromObject({
          name: "😱 High amount of dwstETH minted",
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
      lastReportedTooManyMints = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleEulerTx(txEvent, findings);

  return findings;
}

function handleEulerTx(txEvent: TransactionEvent, findings: Finding[]) {
  if (DWSTETH_TOKEN_ADDRESS in txEvent.addresses) {
    const events = txEvent.filterLog(TRANSFER_EVENT, DWSTETH_TOKEN_ADDRESS);
    events.forEach((event) => {
      if (event.args._from == "0x0000000000000000000000000000000000000000") {
        const amount = new BigNumber(String(event.args._value));
        mintsCache.push({
          time: txEvent.timestamp,
          amount: amount,
        });
      }
    });
  }
}
