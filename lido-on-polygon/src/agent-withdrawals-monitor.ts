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
import { ethersProvider } from "./ethers";

import ST_MATIC_ABI from "./abi/stMaticToken.json";
import {
  ST_MATIC_TOKEN_ADDRESS,
  MATIC_DECIMALS,
  ST_MATIC_REQUEST_WITHDRAWAL_EVENT,
  WITHDRAWALS_MONITORING_WINDOW,
  MAX_WITHDRAWALS_SUM_PERCENT,
} from "./constants";

export const name = "WithdrawalsMonitor";

type IWithdrawalRecord = {
  time: number;
  amount: BigNumber;
};

let lastReportedToManyWithdrawals = 0;
let withdrawalsCache: IWithdrawalRecord[] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const now = (await ethersProvider.getBlock(currentBlock)).timestamp;
  const stMATIC = new ethers.Contract(
    ST_MATIC_TOKEN_ADDRESS,
    ST_MATIC_ABI,
    ethersProvider
  );
  const requestWithdrawFilter = stMATIC.filters.RequestWithdrawEvent();

  const pastBlock =
    currentBlock - Math.ceil(WITHDRAWALS_MONITORING_WINDOW / 13);
  const withdrawEvents = await stMATIC.queryFilter(
    requestWithdrawFilter,
    pastBlock,
    currentBlock - 1
  );
  await Promise.all(
    withdrawEvents.map(async (evt: Event) => {
      if (evt.args) {
        const blockTime = (await evt.getBlock()).timestamp;
        withdrawalsCache.push({
          time: blockTime ? blockTime : now,
          amount: new BigNumber(String(evt.args._amount)),
        });
      }
    })
  );
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleToManyWithdrawals(blockEvent, findings)]);

  return findings;
}

async function handleToManyWithdrawals(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  // remove old withdrawals records
  withdrawalsCache = withdrawalsCache.filter(
    (x: IWithdrawalRecord) => x.time > now - WITHDRAWALS_MONITORING_WINDOW
  );
  if (lastReportedToManyWithdrawals + WITHDRAWALS_MONITORING_WINDOW < now) {
    const stMatic = new ethers.Contract(
      ST_MATIC_TOKEN_ADDRESS,
      ST_MATIC_ABI,
      ethersProvider
    );

    const totalPooledMatic = new BigNumber(
      String(
        await stMatic.functions
          .getTotalPooledMatic({
            blockTag: blockEvent.block.number,
          })
          .then((value) => new BigNumber(String(value)))
      )
    );
    let withdrawalsSum = new BigNumber(0);
    withdrawalsCache.forEach(
      (x: IWithdrawalRecord) => (withdrawalsSum = withdrawalsSum.plus(x.amount))
    );
    const withdrawalsPercent = withdrawalsSum.div(totalPooledMatic).times(100);
    if (
      withdrawalsPercent.isGreaterThanOrEqualTo(MAX_WITHDRAWALS_SUM_PERCENT)
    ) {
      findings.push(
        Finding.fromObject({
          name: `Huge withdrawals during last ${Math.floor(
            WITHDRAWALS_MONITORING_WINDOW / (60 * 60)
          )} hours`,
          description: `There were withdrawals requests for the ${withdrawalsSum
            .div(MATIC_DECIMALS)
            .toFixed(4)} MATIC in total`,
          alertId: "HUGE-WITHDRAWALS-REQUESTS-MATIC",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedToManyWithdrawals = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleWithdrawalEvent(txEvent, findings);

  return findings;
}

function handleWithdrawalEvent(txEvent: TransactionEvent, findings: Finding[]) {
  if (txEvent.to === ST_MATIC_TOKEN_ADDRESS) {
    const events = txEvent.filterLog(
      ST_MATIC_REQUEST_WITHDRAWAL_EVENT,
      ST_MATIC_TOKEN_ADDRESS
    );
    events.forEach((event) => {
      withdrawalsCache.push({
        time: txEvent.timestamp,
        amount: new BigNumber(String(event.args._amount)),
      });
    });
  }
}
