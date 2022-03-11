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
import { Result } from "@ethersproject/abi";

import { formatEth, formatDelay } from "./utils";
import { makeFuture } from "./utils/future";
import { ethersProvider } from "./ethers";

import LIDO_ORACLE_ABI from "./abi/LidoOracle.json";

import {
  BEACON_REPORT_QUORUM_SKIP_REPORT_WINDOW,
  LIDO_ORACLE_ADDRESS,
  LIDO_ORACLE_BEACON_REPORTED_EVENT,
  LIDO_ORACLE_COMPLETED_EVENT,
  LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD,
  MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO,
  MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM,
  MAX_ORACLE_REPORT_DELAY,
  TRIGGER_PERIOD,
} from "./constants";

export interface OracleReport {
  timestamp: number;
  beaconBalance: BigNumber;
  beaconValidators: number;
  rewards: BigNumber;
}

const ZERO = new BigNumber(0);

// re-fetched from history on startup
let lastReport: OracleReport | null = null;
let lastTriggeredAt = 0;

const ONE_WEEK = 60 * 60 * 24 * 7
const TWO_WEEKS = 60 * 60 * 24 * 14

const fBlockHandled = makeFuture<void>();
const fTxHandled = makeFuture<void>();
const byBlockNumberDesc = (e1: Event, e2: Event) =>
e2.blockNumber - e1.blockNumber;

let lastBlockHash: string;
let lastTxHash: string;
let oraclesLastVotes: Map<string, number> = new Map();
let oraclesVotesLastAlert: Map<string, number> = new Map();
let agentStartTime = 0;

export const name = "AgentLidoOracle";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  agentStartTime = (await ethersProvider.getBlock(currentBlock)).timestamp
  const lidoOracle = new ethers.Contract(
    LIDO_ORACLE_ADDRESS,
    LIDO_ORACLE_ABI,
    ethersProvider
  );

  const oracles = String(await lidoOracle.functions.getOracleMembers()).split(
    ","
  );
  const oracleReportBeaconFilter = lidoOracle.filters.BeaconReported();
  // ~2 days ago
  const beaconReportStartBlock =
    currentBlock - Math.ceil((2 * 24 * 60 * 60) / 13);
  const reportBeaconEvents = await lidoOracle.queryFilter(
    oracleReportBeaconFilter,
    beaconReportStartBlock,
    currentBlock - 1
  );

  reportBeaconEvents.sort(byBlockNumberDesc);

  oracles.forEach((element: string) => {
    let oracleReports = reportBeaconEvents.filter((event) => {
      if (event.args) {
        return event.args.caller == element;
      } else {
        return false;
      }
    });
    if (oracleReports.length > 0) {
      oraclesLastVotes.set(element, oracleReports[0].blockNumber);
    } else {
      oraclesLastVotes.set(element, 0);
    }
    oraclesVotesLastAlert.set(element, 0);
  });

  const block24HoursAgo = currentBlock - Math.ceil(24 * 60 * 60 / 13)
  const block48HoursAgo = currentBlock - Math.ceil(48 * 60 * 60 / 13) 
  const prevReport = await getOracleReport(block48HoursAgo, block24HoursAgo - 1, null)
  lastReport = await getOracleReport(block24HoursAgo, currentBlock - 1, prevReport)

  console.log(`[AgentLidoOracle] prevReport: ${printReport(prevReport)}`);
  console.log(`[AgentLidoOracle] lastReport: ${printReport(lastReport)}`);

  return {
    lastReportTimestamp: lastReport ? `${lastReport.timestamp}` : "unknown",
    prevReportTimestamp: prevReport ? `${prevReport.timestamp}` : "unknown",
  };
}

async function getOracleReport(blockFrom: number, blockTo: number, prevReport: OracleReport | null = null) {
  const lidoOracle = new ethers.Contract(
    LIDO_ORACLE_ADDRESS,
    LIDO_ORACLE_ABI,
    ethersProvider
  );

  const oracleReportFilter = lidoOracle.filters.Completed();

  const reportEvents = await lidoOracle.queryFilter(
    oracleReportFilter,
    blockFrom,
    blockTo
  );

  reportEvents.sort(byBlockNumberDesc);

  const reportBlocks = await Promise.all(reportEvents.map((e) => e.getBlock()));

  if (reportEvents.length > 0) {
    return processReportEvent(
      reportEvents[0].args,
      reportBlocks[0].timestamp,
      prevReport
    );
  } else {
    return null
  }
}

function processReportEvent(
  eventArgs: Result | undefined,
  timestamp: number,
  prevReport: OracleReport | null
) {
  if (eventArgs == undefined) {
    return null;
  }

  const beaconBalance = new BigNumber(String(eventArgs.beaconBalance));
  const beaconValidators = +eventArgs.beaconValidators;

  const report = {
    timestamp,
    beaconBalance: new BigNumber(String(beaconBalance)),
    beaconValidators: +beaconValidators,
    rewards: ZERO,
  };

  if (prevReport != null) {
    const validatorsDiff = beaconValidators - prevReport.beaconValidators;
    const rewardBase = prevReport.beaconBalance.plus(
      ETH_PER_VALIDATOR.times(validatorsDiff)
    );
    report.rewards = beaconBalance.minus(rewardBase);
  }

  return report;
}

function printReport(report: OracleReport | null) {
  return report == null
    ? "<missing>"
    : `{
    timestamp: ${report.timestamp},
    beaconBalance: ${formatEth(report.beaconBalance, 5)},
    beaconValidators: ${report.beaconValidators},
    rewards: ${formatEth(report.rewards, 5)}\n}`;
}

export async function handleBlock(blockEvent: BlockEvent) {
  lastBlockHash = blockEvent.blockHash;
  fBlockHandled.reset();

  const findings: Finding[] = [];
  const now = blockEvent.block.timestamp;
  const reportDelay = now - (lastReport ? lastReport.timestamp : 0);

  if (reportDelay > 24 * 60 * 60) {
    console.log(`[AgentLidoOracle] reportDelay: ${reportDelay}`);
  }

  if (
    reportDelay > MAX_ORACLE_REPORT_DELAY &&
    now - lastTriggeredAt >= TRIGGER_PERIOD
  ) {
    // fetch events history 1 more time to be sure that there were actually no reports during last 25 hours
    // needed to handle situation with the missed TX with pres report
    lastReport = await getOracleReport(blockEvent.blockNumber - Math.ceil(24 * 60 * 60 / 13), blockEvent.blockNumber - 1, lastReport)
    console.log(lastReport)
    const reportDelayUpdated = now - (lastReport ? lastReport.timestamp : 0);
    if (reportDelayUpdated > MAX_ORACLE_REPORT_DELAY) {
      findings.push(
        Finding.fromObject({
          name: "Lido Oracle report overdue",
          description: `Time since last report: ${formatDelay(reportDelayUpdated)}`,
          alertId: "LIDO-ORACLE-OVERDUE",
          severity: FindingSeverity.High,
          type: FindingType.Degraded,
          metadata: {
            delay: `${reportDelayUpdated}`,
          },
        })
      );
      lastTriggeredAt = now;
    }
  }
  oraclesLastVotes.forEach((lastRepBlock, oracle) => {
    let lastAlert = oraclesVotesLastAlert.get(oracle);
    if (
      lastAlert == undefined ||
      lastAlert < now - BEACON_REPORT_QUORUM_SKIP_REPORT_WINDOW
    ) {
      if ((lastRepBlock != 0 || agentStartTime + TWO_WEEKS < now) && lastRepBlock < blockEvent.blockNumber - MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM) {
        findings.push(
          Finding.fromObject({
            name: "Super sloppy Lido Oracle",
            description: `Oracle ${oracle} has not reported before the quorum for more than 2 week`,
            alertId: "SLOPPY-LIDO-ORACLE",
            severity: FindingSeverity.Medium,
            type: FindingType.Suspicious,
          })
        );
        oraclesVotesLastAlert.set(oracle, now);
      } else if ( (lastRepBlock != 0 || agentStartTime + ONE_WEEK < now) && lastRepBlock < blockEvent.blockNumber - MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO) {
        findings.push(
          Finding.fromObject({
            name: "Sloppy Lido Oracle",
            description: `Oracle ${oracle} has not reported before the quorum for more than 1 week`,
            alertId: "SLOPPY-LIDO-ORACLE",
            severity: FindingSeverity.Info,
            type: FindingType.Suspicious,
          })
        );
        oraclesVotesLastAlert.set(oracle, now);
      }
    }
  });

  fBlockHandled.resolve();

  return findings;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  lastTxHash = txEvent.hash;
  fTxHandled.reset();

  const findings: Finding[] = [];

  if (txEvent.to === LIDO_ORACLE_ADDRESS) {
    handleOracleTx(txEvent, findings);
    handleReportBeacon(txEvent);
  }

  fTxHandled.resolve();

  return findings;
}

const ETH_PER_VALIDATOR = new BigNumber(10).pow(18).times(32);

function handleOracleTx(txEvent: TransactionEvent, findings: Finding[]) {
  const [reportEvent] = txEvent.filterLog(
    LIDO_ORACLE_COMPLETED_EVENT,
    LIDO_ORACLE_ADDRESS
  );
  if (reportEvent == undefined) {
    return;
  }

  const newReport = processReportEvent(
    reportEvent.args,
    txEvent.block.timestamp,
    lastReport
  );
  if (newReport == null) {
    return;
  }

  const beaconBalanceEth = formatEth(newReport.beaconBalance, 3);
  const rewardsEth = formatEth(newReport.rewards, 3);

  let rewardsDiff: BigNumber | null = null;
  let rewardsDiffPercent: number | null = null;
  let reportDelay: number | null = null;
  let rewardsDiffDesc = "unknown";
  let reportDelayDesc = "unknown";

  if (lastReport != null) {
    rewardsDiff = newReport.rewards.minus(lastReport.rewards);
    rewardsDiffPercent =
      +rewardsDiff.dividedBy(lastReport.rewards).toFixed(4) * 100;
    rewardsDiffDesc = `${rewardsDiff.isNegative() ? "" : "+"}${formatEth(
      rewardsDiff,
      3
    )} ETH`;
    reportDelay = txEvent.block.timestamp - lastReport.timestamp;
    reportDelayDesc = formatDelay(reportDelay);
  }

  const metadata = {
    beaconBalance: `${newReport.beaconBalance.toFixed(0)}`,
    beaconValidators: `${newReport.beaconValidators}`,
    rewards: `${newReport.rewards.toFixed(0)}`,
    rewardsDiff: `${rewardsDiff == null ? "null" : rewardsDiff.toFixed(0)}`,
    rewardsDiffPercent: `${
      rewardsDiffPercent == null ? "null" : rewardsDiffPercent
    }`,
    reportDelay: `${reportDelay == null ? "null" : reportDelay}`,
  };

  findings.push(
    Finding.fromObject({
      name: "Lido Oracle report",
      description:
        `Total balance: ${beaconBalanceEth} ETH, ` +
        `total validators: ${newReport.beaconValidators}, ` +
        `rewards: ${rewardsEth} ETH (${rewardsDiffDesc}), ` +
        `time since last report: ${reportDelayDesc}`,
      alertId: "LIDO-ORACLE-REPORT",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      metadata: metadata,
    })
  );

  if (
    lastReport != null &&
    rewardsDiffPercent! < -LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD
  ) {
    const rewardsDiffEth = formatEth(rewardsDiff, 3);
    const prevRewardsEth = formatEth(lastReport.rewards, 3);
    findings.push(
      Finding.fromObject({
        name: "Lido Beacon rewards decreased",
        description:
          `Rewards decreased from ${prevRewardsEth} ETH to ${rewardsEth} ` +
          `by ${rewardsDiffEth} ETH (${rewardsDiffPercent?.toFixed(2)}%)`,
        alertId: "LIDO-ORACLE-REWARDS-DECREASED",
        severity: FindingSeverity.Medium,
        type: FindingType.Degraded,
        metadata: {
          ...metadata,
          prevRewards: `${lastReport.rewards.toFixed(0)}`,
        },
      })
    );
  }

  lastReport = newReport;
}

export async function waitBlockHandled(expectedBlockHash: string) {
  if (lastBlockHash !== expectedBlockHash) {
    throw new Error(
      `unexpected block hash: ${lastBlockHash} !== ${expectedBlockHash}`
    );
  }
  await fBlockHandled.promise;
}

export async function waitTxHandled(expectedTxHash: string) {
  if (lastTxHash !== expectedTxHash) {
    throw new Error(`unexpected tx hash`);
  }
  await fTxHandled.promise;
}

export function getLastOracleReport() {
  return lastReport == null ? null : { ...lastReport };
}

function handleReportBeacon(txEvent: TransactionEvent) {
  const beaconReportedEvents = txEvent.filterLog(
    LIDO_ORACLE_BEACON_REPORTED_EVENT,
    LIDO_ORACLE_ADDRESS
  );
  beaconReportedEvents.forEach((event) => {
    if (event.args.caller) {
      oraclesLastVotes.set(event.args.caller, txEvent.blockNumber);
    }
  });
}
