import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { Result } from "@ethersproject/abi";

import { formatEth, formatDelay } from "./utils";
import { ethersProvider } from "./ethers";

import LIDO_ORACLE_ABI from "./abi/LidoOracle.json";

import {
  BEACON_REPORT_QUORUM_SKIP_REPORT_WINDOW,
  LIDO_ORACLE_ADDRESS,
  LIDO_ORACLE_BEACON_REPORTED_EVENT,
  LIDO_ORACLE_COMPLETED_EVENT,
  LIDO_ORACLE_EVENTS_OF_NOTICE,
  LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD,
  MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO,
  MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM,
  MAX_ORACLE_REPORT_DELAY,
  MIN_ORACLE_BALANCE,
  TRIGGER_PERIOD,
} from "./constants";
import { byBlockNumberDesc } from "./utils/tools";
import { ETH_DECIMALS } from "./constants";

export interface OracleReport {
  timestamp: number;
  beaconBalance: BigNumber;
  beaconValidators: number;
  rewards: BigNumber;
}

const ZERO = new BigNumber(0);

// re-fetched from history on startup
let lastReport: OracleReport | null = null;
let lastReportedOverdue = 0;

const THREE_DAYS = 60 * 60 * 24 * 3;

let lastTxHash: string;
let oraclesLastVotes: Map<string, number> = new Map();
let oraclesVotesLastAlert: Map<string, number> = new Map();
let oraclesBalanceLastAlert: Map<string, number> = new Map();
let agentStartTime = 0;
let reportedOverdueCount = 0;

export const name = "LidoOracle";

async function getOracles() {
  const lidoOracle = new ethers.Contract(
    LIDO_ORACLE_ADDRESS,
    LIDO_ORACLE_ABI,
    ethersProvider
  );

  return String(await lidoOracle.functions.getOracleMembers()).split(",");
}

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  agentStartTime = (await ethersProvider.getBlock(currentBlock)).timestamp;
  const lidoOracle = new ethers.Contract(
    LIDO_ORACLE_ADDRESS,
    LIDO_ORACLE_ABI,
    ethersProvider
  );

  const oracles = await getOracles();
  const oracleReportBeaconFilter = lidoOracle.filters.BeaconReported();
  // ~14 days ago
  const beaconReportStartBlock =
    currentBlock - Math.ceil((14 * 24 * 60 * 60) / 13);
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

  const block48HoursAgo = currentBlock - Math.ceil((48 * 60 * 60) / 13);

  const oracleReports = await getOracleReports(
    block48HoursAgo,
    currentBlock - 1
  );
  let prevReport = null;
  if (oracleReports.length > 1) {
    prevReport = processReportEvent(
      oracleReports[1].args,
      (await oracleReports[1].getBlock()).timestamp,
      null
    );
  }
  if (oracleReports.length > 0) {
    lastReport = processReportEvent(
      oracleReports[0].args,
      (await oracleReports[0].getBlock()).timestamp,
      prevReport
    );
  }

  console.log(`[${name}] prevReport: ${printReport(prevReport)}`);
  console.log(`[${name}] lastReport: ${printReport(lastReport)}`);

  return {
    lastReportTimestamp: lastReport ? `${lastReport.timestamp}` : "unknown",
    prevReportTimestamp: prevReport ? `${prevReport.timestamp}` : "unknown",
  };
}

async function getOracleReports(blockFrom: number, blockTo: number) {
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
  return reportEvents;
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
  const findings: Finding[] = [];

  await Promise.all([
    handleOracleVotes(blockEvent, findings),
    handleOracleReportDelay(blockEvent, findings),
    handleOraclesBalances(blockEvent, findings),
  ]);

  return findings;
}

function handleOracleVotes(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  oraclesLastVotes.forEach((lastRepBlock, oracle) => {
    let lastAlert = oraclesVotesLastAlert.get(oracle) || 0;
    if (lastAlert < now - BEACON_REPORT_QUORUM_SKIP_REPORT_WINDOW) {
      if (
        lastRepBlock <
        blockEvent.blockNumber - MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM
      ) {
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
      } else if (
        lastRepBlock <
        blockEvent.blockNumber - MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO
      ) {
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
}

async function handleOracleReportDelay(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  const reportDelay = now - (lastReport ? lastReport.timestamp : 0);

  if (reportDelay > 24 * 60 * 60) {
    console.log(`[AgentLidoOracle] reportDelay: ${reportDelay}`);
  }

  if (
    reportDelay > MAX_ORACLE_REPORT_DELAY &&
    now - lastReportedOverdue >= TRIGGER_PERIOD
  ) {
    // fetch events history 1 more time to be sure that there were actually no reports during last 25 hours
    // needed to handle situation with the missed TX with prev report
    const oracleReports = await getOracleReports(
      blockEvent.blockNumber - Math.ceil((24 * 60 * 60) / 13),
      blockEvent.blockNumber - 1
    );
    if (oracleReports.length > 0) {
      lastReport = processReportEvent(
        oracleReports[0].args,
        (await oracleReports[0].getBlock()).timestamp,
        lastReport
      );
    }
    const reportDelayUpdated = now - (lastReport ? lastReport.timestamp : 0);
    if (reportDelayUpdated > MAX_ORACLE_REPORT_DELAY) {
      const severity =
        reportedOverdueCount % 5 == 0
          ? FindingSeverity.Critical
          : FindingSeverity.High;
      findings.push(
        Finding.fromObject({
          name: "Lido Oracle report overdue",
          description: `Time since last report: ${formatDelay(
            reportDelayUpdated
          )}`,
          alertId: "LIDO-ORACLE-OVERDUE",
          severity: severity,
          type: FindingType.Degraded,
          metadata: {
            delay: `${reportDelayUpdated}`,
          },
        })
      );
      lastReportedOverdue = now;
      reportedOverdueCount += 1;
    }
  }
}

async function handleOraclesBalances(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const oracles = await getOracles();
  await Promise.all(
    oracles.map((oracle) => handleOracleBalance(oracle, blockEvent, findings))
  );
}

async function handleOracleBalance(
  oracle: string,
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  const lastAlert = oraclesBalanceLastAlert.get(oracle) || 0;
  if (now > lastAlert + THREE_DAYS) {
    const balance = new BigNumber(
      String(await ethersProvider.getBalance(oracle))
    ).div(ETH_DECIMALS);
    if (balance.isLessThanOrEqualTo(MIN_ORACLE_BALANCE)) {
      findings.push(
        Finding.fromObject({
          name: "Low balance of Lido Oracle",
          description:
            `Balance of ${oracle} is ` +
            `${balance.toFixed(4)} ETH. This is rather low!`,
          alertId: "LIDO-ORACLE-LOW-BALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Degraded,
          metadata: {
            oracle: oracle,
            balance: `${balance}`,
          },
        })
      );
      oraclesBalanceLastAlert.set(oracle, now);
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  lastTxHash = txEvent.hash;

  const findings: Finding[] = [];

  if (txEvent.to === LIDO_ORACLE_ADDRESS) {
    handleOracleTx(txEvent, findings);
    handleReportBeacon(txEvent);
    handleLidoOracleTransaction(txEvent, findings);
  }

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

  const now = txEvent.block.timestamp;
  const severity =
    now > lastReportedOverdue + TRIGGER_PERIOD
      ? FindingSeverity.Info
      : FindingSeverity.Medium;

  findings.push(
    Finding.fromObject({
      name: "Lido Oracle report",
      description:
        `Total balance: ${beaconBalanceEth} ETH, ` +
        `total validators: ${newReport.beaconValidators}, ` +
        `rewards: ${rewardsEth} ETH (${rewardsDiffDesc}), ` +
        `time since last report: ${reportDelayDesc}`,
      alertId: "LIDO-ORACLE-REPORT",
      severity: severity,
      type: FindingType.Info,
      metadata: metadata,
    })
  );

  reportedOverdueCount = 0;

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

function handleLidoOracleTransaction(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  LIDO_ORACLE_EVENTS_OF_NOTICE.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
        );
      });
    }
  });
}
