import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import ACCOUNTING_ORACLE_ABI from "../../abi/AccountingOracle.json";

import { formatDelay } from "./utils";
import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";
import { ONE_HOUR, SECONDS_PER_SLOT } from "../../common/constants";

// re-fetched from history on startup
let lastReportMainDataSubmitTimestamp = 0;
let lastReportMainDataSubmitOverdueTimestamp = 0;
let reportMainDataSubmitOverdueCount = 0;

let lastReportExtraDataSubmitTimestamp = 0;
let lastReportExtraDataSubmitOverdueTimestamp = 0;
let reportExtraDataSubmitOverdueCount = 0;

export const name = "AccountingOracle";

const {
  TRIGGER_PERIOD,
  REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER,
  ACCOUNTING_ORACLE_ADDRESS,
  MAX_ORACLE_REPORT_MAIN_DATA_SUBMIT_DELAY,
  MAX_ORACLE_REPORT_EXTRA_DATA_SUBMIT_AFTER_MAIN_DATA_DELAY,
  ACCOUNTING_ORACLE_EVENTS_OF_NOTICE,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const block48HoursAgo =
    currentBlock - Math.ceil((48 * ONE_HOUR) / SECONDS_PER_SLOT);

  const mainDataSubmits = await getReportMainDataSubmits(
    block48HoursAgo,
    currentBlock - 1,
  );

  if (mainDataSubmits.length > 0) {
    const reportMainDataSubmitBlock = await mainDataSubmits[
      mainDataSubmits.length - 1
    ].getBlock();
    lastReportMainDataSubmitTimestamp = reportMainDataSubmitBlock.timestamp;
    const extraDataSubmits = await getReportExtraDataSubmits(
      reportMainDataSubmitBlock.number,
      currentBlock - 1,
    );
    if (extraDataSubmits.length > 0) {
      lastReportExtraDataSubmitTimestamp = (
        await extraDataSubmits[extraDataSubmits.length - 1].getBlock()
      ).timestamp;
    }
  }

  return {};
}

async function getReportMainDataSubmits(blockFrom: number, blockTo: number) {
  const accountingOracle = new ethers.Contract(
    ACCOUNTING_ORACLE_ADDRESS,
    ACCOUNTING_ORACLE_ABI,
    ethersProvider,
  );

  const oracleReportFilter = accountingOracle.filters.ReportSubmitted();

  return await accountingOracle.queryFilter(
    oracleReportFilter,
    blockFrom,
    blockTo,
  );
}

async function getReportExtraDataSubmits(blockFrom: number, blockTo: number) {
  const accountingOracle = new ethers.Contract(
    ACCOUNTING_ORACLE_ADDRESS,
    ACCOUNTING_ORACLE_ABI,
    ethersProvider,
  );

  const oracleReportFilter = accountingOracle.filters.ExtraDataSubmitted();

  return await accountingOracle.queryFilter(
    oracleReportFilter,
    blockFrom,
    blockTo,
  );
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleMainDataReportSubmitted(blockEvent, findings);

  return findings;
}

async function handleMainDataReportSubmitted(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const now = blockEvent.block.timestamp;
  const reportMainDataSubmitDelay =
    now - lastReportMainDataSubmitTimestamp ?? 0;

  if (
    (reportMainDataSubmitDelay > MAX_ORACLE_REPORT_MAIN_DATA_SUBMIT_DELAY &&
      now - lastReportMainDataSubmitOverdueTimestamp >= TRIGGER_PERIOD) ||
    (reportMainDataSubmitDelay >
      MAX_ORACLE_REPORT_EXTRA_DATA_SUBMIT_AFTER_MAIN_DATA_DELAY &&
      now - lastReportExtraDataSubmitOverdueTimestamp >= TRIGGER_PERIOD)
  ) {
    // fetch events history 1 more time to be sure that there were actually no reports during last 25 hours
    // needed to handle situation with the missed TX with prev report
    const mainDataSubmits = await getReportMainDataSubmits(
      blockEvent.blockNumber - Math.ceil((24 * ONE_HOUR) / SECONDS_PER_SLOT),
      blockEvent.blockNumber - 1,
    );
    if (mainDataSubmits.length > 0) {
      const reportMainDataSubmitBlock = await mainDataSubmits[
        mainDataSubmits.length - 1
      ].getBlock();
      lastReportMainDataSubmitTimestamp = reportMainDataSubmitBlock.timestamp;
      const extraDataSubmits = await getReportExtraDataSubmits(
        reportMainDataSubmitBlock.number,
        blockEvent.blockNumber - 1,
      );
      if (extraDataSubmits.length > 0) {
        lastReportExtraDataSubmitTimestamp = (
          await extraDataSubmits[extraDataSubmits.length - 1].getBlock()
        ).timestamp;
      }
    }

    const reportMainDataSubmitDelayUpdated =
      now - (lastReportMainDataSubmitTimestamp ?? 0);

    if (
      reportMainDataSubmitDelayUpdated >
      MAX_ORACLE_REPORT_MAIN_DATA_SUBMIT_DELAY
    ) {
      const severity =
        reportMainDataSubmitOverdueCount %
          REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER ==
        0
          ? FindingSeverity.Critical
          : FindingSeverity.High;
      findings.push(
        Finding.fromObject({
          name: "🚨 Accounting Oracle: report MAIN data submit overdue",
          description: `Time since last report: ${formatDelay(
            reportMainDataSubmitDelayUpdated,
          )}`,
          alertId: "ACCOUNTING-ORACLE-MAIN-DATA-OVERDUE",
          severity: severity,
          type: FindingType.Degraded,
          metadata: {
            delay: `${reportMainDataSubmitDelayUpdated}`,
          },
        }),
      );
      lastReportMainDataSubmitOverdueTimestamp = now;
      reportMainDataSubmitOverdueCount += 1;
    } else if (
      reportMainDataSubmitDelayUpdated >
        MAX_ORACLE_REPORT_EXTRA_DATA_SUBMIT_AFTER_MAIN_DATA_DELAY &&
      lastReportMainDataSubmitTimestamp - lastReportExtraDataSubmitTimestamp > 0
    ) {
      const severity =
        reportExtraDataSubmitOverdueCount %
          REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER ==
        0
          ? FindingSeverity.Critical
          : FindingSeverity.High;
      findings.push(
        Finding.fromObject({
          name: "🚨 Accounting Oracle: report EXTRA data submit overdue",
          description: `Time since main data submit: ${formatDelay(
            reportMainDataSubmitDelayUpdated,
          )}`,
          alertId: "ACCOUNTING-ORACLE-EXTRA-DATA-OVERDUE",
          severity: severity,
          type: FindingType.Degraded,
          metadata: {
            delay: `${reportMainDataSubmitDelayUpdated}`,
          },
        }),
      );
      lastReportExtraDataSubmitOverdueTimestamp = now;
      reportExtraDataSubmitOverdueCount += 1;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleEventsOfNotice(txEvent, findings, ACCOUNTING_ORACLE_EVENTS_OF_NOTICE);

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
