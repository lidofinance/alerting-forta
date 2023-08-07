import {
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import ORACLE_REPORT_SANITY_CHECKER_ABI from "../../abi/OracleReportSanityChecker.json";

import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";
import BigNumber from "bignumber.js";

let prevLimits: any = {};

export const name = "OracleReportSanityChecker";

const {
  ORACLE_REPORT_SANITY_CHECKER_ADDRESS,
  ORACLE_REPORT_SANITY_CHECKER_LIMITS_EVENTS,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const oracleReportSanityChecker = new ethers.Contract(
    ORACLE_REPORT_SANITY_CHECKER_ADDRESS,
    ORACLE_REPORT_SANITY_CHECKER_ABI,
    ethersProvider,
  );
  const [limits] =
    await oracleReportSanityChecker.functions.getOracleReportLimits({
      blockTag: currentBlock - 1,
    });

  (limits as []).forEach((value, index) => {
    prevLimits[
      Object.values(ORACLE_REPORT_SANITY_CHECKER_LIMITS_EVENTS)[index]
    ] = value;
  });

  return {};
}

export async function handleTransaction(transactionEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleOracleReportLimits(transactionEvent, findings);

  return findings;
}

async function handleOracleReportLimits(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  const changeLimitEvents = Object.keys(
    ORACLE_REPORT_SANITY_CHECKER_LIMITS_EVENTS,
  );
  const filteredEvents = txEvent.filterLog(changeLimitEvents);
  if (!filteredEvents) return;
  let changed = false;
  let description = "Changed limits:";
  filteredEvents.forEach((event) => {
    const eventSign = changeLimitEvents.find((eventName) =>
      eventName.includes(event.name),
    );
    if (!eventSign) return;
    const limitName = (ORACLE_REPORT_SANITY_CHECKER_LIMITS_EVENTS as any)[
      eventSign
    ];
    if (
      limitName &&
      new BigNumber(String(prevLimits[limitName])) !=
        new BigNumber(String(event.args[limitName]))
    ) {
      description += `\n ${limitName} [${prevLimits[limitName]} -> ${event.args[limitName]}]`;
      prevLimits[limitName] = event.args[limitName];
      changed = true;
    }
  });
  if (changed) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ Oracle Report Sanity Checker: limits were changed",
        description: description,
        alertId: "ORACLE-REPORT-SANITY-CHECKER-LIMITS-CHANGED",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      }),
    );
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
