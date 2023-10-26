import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { Event } from "ethers";

import L2_BRIDGE_ABI from "./abi/L2Bridge.json";
import {
  L2_ERC20_TOKEN_GATEWAY,
  MAX_WITHDRAWALS_WINDOW,
  MAX_WITHDRAWALS_SUM,
  ETH_DECIMALS,
  WITHDRAWAL_INITIATED_EVENT,
} from "./constants";
import { baseProvider } from "./providers";

export const name = "WithdrawalsMonitor";

type IWithdrawalRecord = {
  time: number;
  amount: BigNumber;
};

let lastReportedToManyWithdrawals = 0;
let withdrawalsCache: IWithdrawalRecord[] = [];

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const now = (await baseProvider.getBlock(currentBlock)).timestamp;
  const l2Bridge = new ethers.Contract(
    L2_ERC20_TOKEN_GATEWAY,
    L2_BRIDGE_ABI,
    baseProvider,
  );
  const withdrawalInitiatedFilter = l2Bridge.filters.WithdrawalInitiated();

  const pastBlock = currentBlock - Math.ceil(MAX_WITHDRAWALS_WINDOW / 13);
  const withdrawEvents = await l2Bridge.queryFilter(
    withdrawalInitiatedFilter,
    pastBlock,
    currentBlock - 1,
  );
  await Promise.all(
    withdrawEvents.map(async (evt: Event) => {
      if (evt.args) {
        const blockTime = (await evt.getBlock()).timestamp;
        withdrawalsCache.push({
          time: blockTime ? blockTime : now,
          amount: new BigNumber(String(evt.args.amount)),
        });
      }
    }),
  );
  let withdrawalsSum = new BigNumber(0);
  withdrawalsCache.forEach(
    (x: IWithdrawalRecord) => (withdrawalsSum = withdrawalsSum.plus(x.amount)),
  );
  return {
    currentWithdrawals: withdrawalsSum.div(ETH_DECIMALS).toFixed(2),
  };
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleToManyWithdrawals(blockEvent, findings)]);

  return findings;
}

async function handleToManyWithdrawals(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const now = blockEvent.block.timestamp;
  // remove withdrawals records older than MAX_WITHDRAWALS_WINDOW
  withdrawalsCache = withdrawalsCache.filter(
    (x: IWithdrawalRecord) => x.time > now - MAX_WITHDRAWALS_WINDOW,
  );
  let withdrawalsSum = new BigNumber(0);
  withdrawalsCache.forEach(
    (x: IWithdrawalRecord) => (withdrawalsSum = withdrawalsSum.plus(x.amount)),
  );
  const period =
    now - lastReportedToManyWithdrawals < MAX_WITHDRAWALS_WINDOW
      ? now - lastReportedToManyWithdrawals
      : MAX_WITHDRAWALS_WINDOW;
  // block number condition is meant to "sync" agents alerts
  if (
    withdrawalsSum
      .div(ETH_DECIMALS)
      .isGreaterThanOrEqualTo(MAX_WITHDRAWALS_SUM) &&
    blockEvent.blockNumber % 10 == 0
  ) {
    findings.push(
      Finding.fromObject({
        name:
          `⚠️ Base: Huge withdrawals during the last ` +
          `${Math.floor(period / (60 * 60))} hour(s)`,
        description:
          `There were withdrawals requests from L2 to L1 for the ` +
          `${withdrawalsSum.div(ETH_DECIMALS).toFixed(4)} wstETH in total`,
        alertId: "HUGE-WITHDRAWALS-FROM-L2",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      }),
    );
    lastReportedToManyWithdrawals = now;
    // remove reported withdrawals records
    withdrawalsCache = withdrawalsCache.filter(
      (x: IWithdrawalRecord) => x.time > lastReportedToManyWithdrawals,
    );
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleWithdrawalEvent(txEvent, findings);

  return findings;
}

function handleWithdrawalEvent(txEvent: TransactionEvent, findings: Finding[]) {
  if (L2_ERC20_TOKEN_GATEWAY in txEvent.addresses) {
    const events = txEvent.filterLog(
      WITHDRAWAL_INITIATED_EVENT,
      L2_ERC20_TOKEN_GATEWAY,
    );
    events.forEach((event) => {
      withdrawalsCache.push({
        time: txEvent.timestamp,
        amount: new BigNumber(String(event.args.amount)),
      });
    });
  }
}
