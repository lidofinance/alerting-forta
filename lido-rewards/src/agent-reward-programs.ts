import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import EASY_TRACK_ABI from "./abi/EasyTrack.json";
import TOP_UP_REWARDS_ABI from "./abi/TopUpRewards.json";

import {
  LDO_DECIMALS,
  EASY_TRACK_ADDRESS,
  TOP_UP_REWARDS_ADDRESS,
  MOTION_CREATED_EVENT,
  MOTION_ENACTED_EVENT,
} from "./constants";

import { ethersProvider } from "./ethers";
import { formatLdo } from "./utils";

let enactedTopUpMotions = new Map<number, BigNumber>();
let pendingTopUpMotions = new Map<number, BigNumber>();
let dayOfMonth = 0;

// 6 000 000 LDO
const LDO_THRESHOLD_MONTH = new BigNumber(6 * 10 ** 6).times(LDO_DECIMALS);

// 10 days
const MOTION_LIFETIME_THRESHOLD = 60 * 60 * 24 * 10;

export const name = "RewardPrograms";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const easyTrack = new ethers.Contract(
    EASY_TRACK_ADDRESS,
    EASY_TRACK_ABI,
    ethersProvider
  );
  const topUpRewards = new ethers.Contract(
    TOP_UP_REWARDS_ADDRESS,
    TOP_UP_REWARDS_ABI,
    ethersProvider
  );
  dayOfMonth = new Date().getDate();
  const pastBlockEnacted =
    currentBlock - Math.floor((60 * 60 * 24 * dayOfMonth) / 13);
  const pastBlockCreated =
    currentBlock - Math.floor(MOTION_LIFETIME_THRESHOLD / 13);
  const pastBlockCreatedEventSearch =
    pastBlockEnacted - Math.floor(MOTION_LIFETIME_THRESHOLD / 13);
  const filterEnacted = easyTrack.filters.MotionEnacted();
  const filterCreated = easyTrack.filters.MotionCreated();

  const motionsEnacted = (
    await easyTrack.queryFilter(filterEnacted, pastBlockEnacted, currentBlock)
  ).map((value: any) => parseInt(String(value.args._motionId)));
  await Promise.all(
    motionsEnacted.map(async (id: number) => {
      const filterCreatedWithId = easyTrack.filters.MotionCreated(id);
      const [creationEvent] = await easyTrack.queryFilter(
        filterCreatedWithId,
        pastBlockCreatedEventSearch,
        currentBlock
      );
      if (
        creationEvent &&
        creationEvent.args &&
        creationEvent.args._evmScriptFactory.toLowerCase() ==
          TOP_UP_REWARDS_ADDRESS
      ) {
        const callData = await topUpRewards.functions.decodeEVMScriptCallData(
          creationEvent.args._evmScriptCallData
        );
        let sumAmount = new BigNumber(0);
        callData._amounts.map((value: any) => {
          sumAmount = sumAmount.plus(new BigNumber(String(value)));
        });
        enactedTopUpMotions.set(id, sumAmount);
      }
    })
  );
  console.log(
    `[${name}] Spent LDO so far this month: ` +
      `${formatLdo(sumMapValues(enactedTopUpMotions), 0)} LDO`
  );

  const motionsCreated = await easyTrack.queryFilter(
    filterCreated,
    pastBlockCreated,
    currentBlock
  );

  // filter out enacted motions
  await Promise.all(
    motionsCreated.map(async (value: any) => {
      const id = parseInt(String(value.args._motionId));
      if (
        value.args._evmScriptFactory.toLowerCase() == TOP_UP_REWARDS_ADDRESS &&
        !enactedTopUpMotions.get(id)
      ) {
        const callData = await topUpRewards.functions.decodeEVMScriptCallData(
          value.args._evmScriptCallData
        );
        let sumAmount = new BigNumber(0);
        callData._amounts.map((value: any) => {
          sumAmount = sumAmount.plus(new BigNumber(String(value)));
        });
        pendingTopUpMotions.set(id, sumAmount);
      }
    })
  );

  console.log(
    `[${name}] Pending LDO in motions: ` +
      `${formatLdo(sumMapValues(pendingTopUpMotions), 0)} LDO`
  );
  console.log(
    `[${name}] Left LDO this month (inc pending): ${formatLdo(
      LDO_THRESHOLD_MONTH.minus(sumMapValues(enactedTopUpMotions)).minus(
        sumMapValues(pendingTopUpMotions)
      ),
      0
    )} LDO`
  );
  return {
    pendingMotions: `[${Array.from(pendingTopUpMotions.keys()).join(",")}]`,
    enactedMotions: `[${Array.from(enactedTopUpMotions.keys()).join(",")}]`,
  };
}

function sumMapValues(mapping: Map<number, BigNumber>) {
  let sum = new BigNumber(0);
  mapping.forEach((value, key, map) => {
    sum = sum.plus(value);
  });
  return sum;
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  const dayOfMonthNew = new Date().getDate();
  // clean up enacted motions if there is a new month
  if (dayOfMonth - dayOfMonthNew > 27) {
    enactedTopUpMotions.clear();
    console.log(`New month is here! Previous enacted motions cleared.`);
    console.log(
      `pendingMotions: ` +
        `[${Array.from(pendingTopUpMotions.keys()).join(",")}]`
    );
    console.log(
      `enactedMotions: ` +
        `[${Array.from(enactedTopUpMotions.keys()).join(",")}]`
    );
  }
  if (dayOfMonth != dayOfMonthNew) {
    dayOfMonth = dayOfMonthNew;
  }

  return findings;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleEasyTrackTransaction(txEvent, findings);

  return findings;
}

async function handleEasyTrackTransaction(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (EASY_TRACK_ADDRESS in txEvent.addresses) {
    const topUpRewards = new ethers.Contract(
      TOP_UP_REWARDS_ADDRESS,
      TOP_UP_REWARDS_ABI,
      ethersProvider
    );
    const eventsCreated = txEvent.filterLog(
      MOTION_CREATED_EVENT,
      EASY_TRACK_ADDRESS
    );
    for (const eventCreated of eventsCreated) {
      const id = parseInt(String(eventCreated.args._motionId));
      if (
        eventCreated.args._evmScriptFactory.toLowerCase() ==
        TOP_UP_REWARDS_ADDRESS
      ) {
        const callData = await topUpRewards.functions.decodeEVMScriptCallData(
          eventCreated.args._evmScriptCallData
        );
        let sumAmount = new BigNumber(0);
        callData._amounts.map((value: any) => {
          sumAmount = sumAmount.plus(new BigNumber(String(value)));
        });
        pendingTopUpMotions.set(id, sumAmount);
        const spent = sumMapValues(enactedTopUpMotions);
        const pending = sumMapValues(pendingTopUpMotions);
        const left = LDO_THRESHOLD_MONTH.minus(
          sumMapValues(enactedTopUpMotions)
        ).minus(sumMapValues(pendingTopUpMotions));
        findings.push(
          Finding.fromObject({
            name: "Rewards Top Up Motion created",
            description:
              `${formatLdo(sumAmount, 0)} LDO was added to pending ` +
              `due to Motion ${id} creation.\n` +
              `Spent LDO so far this month: ${formatLdo(spent, 0)} LDO\n` +
              `Pending LDO in motions: ${formatLdo(pending, 0)} LDO\n` +
              `Left LDO this month (inc pending): ${formatLdo(left, 0)} LDO`,
            alertId: "REWARD-PROGRAM-TOP-UP-MOTION-CREATED",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
            metadata: {
              motionId: id.toFixed(),
              amountPending: formatLdo(sumAmount, 0),
              spentTotal: formatLdo(spent, 0),
              pendingTotal: formatLdo(pending, 0),
              left: formatLdo(left, 0),
              pendingMotions: `[${Array.from(pendingTopUpMotions.keys()).join(
                ","
              )}]`,
              enactedMotions: `[${Array.from(enactedTopUpMotions.keys()).join(
                ","
              )}]`,
            },
          })
        );
      }
    }
    const eventsEnacted = txEvent.filterLog(
      MOTION_ENACTED_EVENT,
      EASY_TRACK_ADDRESS
    );
    for (const eventEnacted of eventsEnacted) {
      const id = parseInt(String(eventEnacted.args._motionId));
      const amount = pendingTopUpMotions.get(id);
      pendingTopUpMotions.delete(id);
      // return since this is not a top-up motion
      if (!amount) {
        return;
      }
      enactedTopUpMotions.set(id, amount);
      const spent = sumMapValues(enactedTopUpMotions);
      const pending = sumMapValues(pendingTopUpMotions);
      const left = LDO_THRESHOLD_MONTH.minus(
        sumMapValues(enactedTopUpMotions)
      ).minus(sumMapValues(pendingTopUpMotions));
      findings.push(
        Finding.fromObject({
          name: "Rewards Top Up Motion enacted",
          description:
            `${formatLdo(amount, 0)} LDO was spent ` +
            `due to Motion ${id} execution.\n` +
            `Spent LDO so far this month: ${formatLdo(spent, 0)} LDO\n` +
            `Pending LDO in motions: ${formatLdo(pending, 0)} LDO\n` +
            `Left LDO this month (inc pending): ${formatLdo(left, 0)} LDO`,
          alertId: "REWARD-PROGRAM-TOP-UP-MOTION-ENACTED",
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          metadata: {
            motionId: id.toFixed(),
            amountSpent: formatLdo(amount, 0),
            spentTotal: formatLdo(spent, 0),
            pendingTotal: formatLdo(pending, 0),
            left: formatLdo(left, 0),
            pendingMotions: `[${Array.from(pendingTopUpMotions.keys()).join(
              ","
            )}]`,
            enactedMotions: `[${Array.from(enactedTopUpMotions.keys()).join(
              ","
            )}]`,
          },
        })
      );
    }
  }
}
