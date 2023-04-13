import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import EXITBUS_ORACLE_ABI from "../../abi/ValidatorsExitBusOracle.json";

import { byBlockNumberDesc, formatDelay } from "./utils";
import { handleEventsOfNotice, requireWithTier } from "../../common/utils";

// re-fetched from history on startup
let lastReportSubmitTimestamp = 0;
let lastReportSubmitOverdueTimestamp = 0;

let reportSubmitOverdueCount = 0;

export const name = "ExitBusOracle";

import type * as Constants from "./constants";
const {
  TRIGGER_PERIOD,
  EXITBUS_ORACLE_ADDRESS,
  MAX_ORACLE_REPORT_SUBMIT_DELAY,
  EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT,
  EXITBUS_ORACLE_EVENTS_OF_NOTICE,
} = requireWithTier<typeof Constants>(module, `./constants`);

const log = (text: string) => console.log(`[${name}] ${text}`);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const block48HoursAgo = currentBlock - Math.ceil((48 * 60 * 60) / 12);

  const reportSubmits = await getReportSubmits(
    block48HoursAgo,
    currentBlock - 1
  );
  let prevReportSubmitTimestamp = 0;
  if (reportSubmits.length > 1) {
    prevReportSubmitTimestamp = (await reportSubmits[1].getBlock()).timestamp;
  }
  if (reportSubmits.length > 0) {
    lastReportSubmitTimestamp = (await reportSubmits[0].getBlock()).timestamp;
  }

  log(
    `Prev report submit: ${new Date(
      prevReportSubmitTimestamp * 1000
    ).toUTCString()}`
  );
  log(
    `Last report submit: ${new Date(
      lastReportSubmitTimestamp * 1000
    ).toUTCString()}`
  );

  return {
    lastReportTimestamp: String(lastReportSubmitTimestamp) ?? "unknown",
    prevReportTimestamp: String(prevReportSubmitTimestamp) ?? "unknown",
  };
}

async function getReportSubmits(blockFrom: number, blockTo: number) {
  const exitbusOracle = new ethers.Contract(
    EXITBUS_ORACLE_ADDRESS,
    EXITBUS_ORACLE_ABI,
    ethersProvider
  );

  const oracleReportFilter = exitbusOracle.filters.ReportSubmitted();

  const submitEvents = await exitbusOracle.queryFilter(
    oracleReportFilter,
    blockFrom,
    blockTo
  );

  submitEvents.sort(byBlockNumberDesc);
  return submitEvents;
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleReportSubmitted(blockEvent, findings)]);

  return findings;
}

async function handleReportSubmitted(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  const reportSubmitDelay =
    now - (lastReportSubmitTimestamp ? lastReportSubmitTimestamp : 0);

  if (reportSubmitDelay > 24 * 60 * 60) {
    log(`reportDelay: ${reportSubmitDelay}`);
  }

  if (
    reportSubmitDelay > MAX_ORACLE_REPORT_SUBMIT_DELAY &&
    now - lastReportSubmitOverdueTimestamp >= TRIGGER_PERIOD
  ) {
    // fetch events history 1 more time to be sure that there were actually no reports during last 25 hours
    // needed to handle situation with the missed TX with prev report
    const reportSubmits = await getReportSubmits(
      blockEvent.blockNumber - Math.ceil((24 * 60 * 60) / 12),
      blockEvent.blockNumber - 1
    );
    if (reportSubmits.length > 0) {
      lastReportSubmitTimestamp = (await reportSubmits[0].getBlock()).timestamp;
    }
    const reportSubmitDelayUpdated =
      now - (lastReportSubmitTimestamp ? lastReportSubmitTimestamp : 0);
    if (reportSubmitDelayUpdated > MAX_ORACLE_REPORT_SUBMIT_DELAY) {
      const severity =
        reportSubmitOverdueCount % 5 == 0
          ? FindingSeverity.Critical
          : FindingSeverity.High;
      findings.push(
        Finding.fromObject({
          name: "🚨 Accounting Oracle report submit overdue",
          description: `Time since last report: ${formatDelay(
            reportSubmitDelayUpdated
          )}`,
          alertId: "ACCOUNTING-ORACLE-OVERDUE",
          severity: severity,
          type: FindingType.Degraded,
          metadata: {
            delay: `${reportSubmitDelayUpdated}`,
          },
        })
      );
      lastReportSubmitOverdueTimestamp = now;
      reportSubmitOverdueCount += 1;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (txEvent.to == EXITBUS_ORACLE_ADDRESS) {
    await handleExitRequest(txEvent, findings);
  }

  handleEventsOfNotice(txEvent, findings, EXITBUS_ORACLE_EVENTS_OF_NOTICE);

  return findings;
}

async function handleExitRequest(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const exitRequests = txEvent.filterLog(
    EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT,
    EXITBUS_ORACLE_ADDRESS
  );
  if (!exitRequests) return;
  if (exitRequests.length > 1000) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ ExitBus Oracle: requested to exit more than 1000 validators",
        description: `Requested to exit ${exitRequests.length} validators in a single report`,
        alertId: "EXITBUS-ORACLE-MANY-EXIT-REQUESTS",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  } else if (exitRequests.length > 100) {
    findings.push(
      Finding.fromObject({
        name: "ℹ️ ExitBus Oracle: requested to exit more than 100 validators",
        description: `Requested to exit ${exitRequests.length} validators in a single report`,
        alertId: "EXITBUS-ORACLE-MANY-EXIT-REQUESTS",
        severity: FindingSeverity.Info,
        type: FindingType.Suspicious,
      })
    );
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
