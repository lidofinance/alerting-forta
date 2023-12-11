import BigNumber from "bignumber.js";
import { Event } from "ethers";
import { Log } from "@ethersproject/abstract-provider";
import { ethers, Finding, FindingType, FindingSeverity } from "forta-agent";

import L2_BRIDGE_ABI from "./abi/L2Bridge.json";

import {
  L2_ERC20_TOKEN_GATEWAY,
  MAX_WITHDRAWALS_WINDOW,
  MAX_WITHDRAWALS_SUM,
  ETH_DECIMALS,
  WITHDRAWAL_INITIATED_EVENT,
} from "./constants";
import { baseProvider } from "./providers";
import { TransactionEventHelper } from "./entity/transactionEvent";

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

export async function handleBlock(blockEvent: BlockDto) {
  const findings: Finding[] = [];

  await Promise.all([handleToManyWithdrawals(blockEvent, findings)]);

  return findings;
}

async function handleToManyWithdrawals(block: BlockDto, findings: Finding[]) {
  const now = block.timestamp;
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
    block.number % 10 == 0
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

export async function handleTransaction(logs: Log[], blocksDto: BlockDto[]) {
  const findings: Finding[] = [];

  handleWithdrawalEvent(logs, blocksDto, findings);

  return findings;
}

function handleWithdrawalEvent(
  logs: Log[],
  blocksDto: BlockDto[],
  findings: Finding[],
) {
  const blockNumberToBlock = new Map<number, BlockDto>();
  const logIndexToLogs = new Map<number, Log>();
  let addresses = [];

  for (const log of logs) {
    logIndexToLogs.set(log.logIndex, log);
    addresses.push(log.address);
  }

  for (const blockDto of blocksDto) {
    blockNumberToBlock.set(blockDto.number, blockDto);
  }

  if (L2_ERC20_TOKEN_GATEWAY in addresses) {
    const events = TransactionEventHelper.filterLog(
      logs,
      WITHDRAWAL_INITIATED_EVENT,
      L2_ERC20_TOKEN_GATEWAY,
    );

    for (const event of events) {
      // @ts-ignore
      const log: Log = logIndexToLogs.get(event.logIndex);
      // @ts-ignore
      const blockDto: BlockDto = blockNumberToBlock.get(log.blockNumber);

      withdrawalsCache.push({
        time: blockDto.timestamp,
        amount: new BigNumber(String(event.args.amount)),
      });
    }
  }
}
