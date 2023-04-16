import {
  ethers,
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import ORACLE_REPORT_SANITY_CHECKER_ABI from "../../abi/OracleReportSanityChecker.json";

import { requireWithTier } from "../../common/utils";

let prevLimits: BigNumber[] = [];

export const name = "OracleReportSanityChecker";

import type * as Constants from "./constants";
import BigNumber from "bignumber.js";
const {
  ORACLE_REPORT_SANITY_CHECKER_ADDRESS,
  ORACLE_REPORT_SANITY_CHECKER_LIMITS,
} = requireWithTier<typeof Constants>(module, `./constants`);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const oracleReportSanityChecker = new ethers.Contract(
    ORACLE_REPORT_SANITY_CHECKER_ADDRESS,
    ORACLE_REPORT_SANITY_CHECKER_ABI,
    ethersProvider
  );
  [prevLimits] =
    await oracleReportSanityChecker.functions.getOracleReportLimits({
      blockTag: currentBlock,
    });

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleOracleReportLimits(blockEvent, findings);

  return findings;
}

async function handleOracleReportLimits(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const oracleReportSanityChecker = new ethers.Contract(
    ORACLE_REPORT_SANITY_CHECKER_ADDRESS,
    ORACLE_REPORT_SANITY_CHECKER_ABI,
    ethersProvider
  );
  let currentLimits: BigNumber[];

  [currentLimits] =
    await oracleReportSanityChecker.functions.getOracleReportLimits({
      blockTag: blockEvent.blockNumber,
    });

  let changed = false;
  let description = "Changed limits:";
  currentLimits.forEach((value, index) => {
    if (!value.eq(prevLimits[index])) {
      description += `${ORACLE_REPORT_SANITY_CHECKER_LIMITS[index]}: ${prevLimits[index]} -> ${value}\n`;
      changed = true;
    }
  });
  if (changed) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ Oracle Report Sanity Checker: some limits were changed",
        description: description,
        alertId: "ORACLE-REPORT-SANITY-CHECKER-LIMITS-CHANGED",
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
      })
    );
  }

  prevLimits = currentLimits;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
