import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import HASH_CONSENSUS_ABI from "../../abi/HashConsensus.json";

import { getMemberName } from "./utils";
import {
  etherscanAddress,
  getLogsByChunks,
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import {
  ETH_DECIMALS,
  ONE_WEEK,
  BN_ZERO,
  ONE_DAY,
  SECONDS_PER_SLOT,
  MemberReport,
} from "../../common/constants";

// re-fetched from history on startup
let membersAddresses: string[] = [];
let membersLastReport: Map<string, MemberReport> = new Map();
let membersBalanceLastAlert: Map<string, number> = new Map();

export const name = "ExitBusOracleHashConsensus";

import type * as Constants from "./constants";
const {
  MIN_MEMBER_BALANCE_INFO,
  MIN_MEMBER_BALANCE_HIGH,
  MAX_REPORT_SUBMIT_SKIP_BLOCKS_INFO,
  MAX_REPORT_SUBMIT_SKIP_BLOCKS_MEDIUM,
  EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE,
  EXITBUS_ORACLE_MEMBERS,
  EXITBUS_HASH_CONSENSUS_REPORT_RECEIVED_EVENT,
  EXITBUS_HASH_CONSENSUS_ADDRESS,
  EXITBUS_ORACLE_ADDRESS,
  EXITBUS_ORACLE_REPORT_SUBMITTED_EVENT,
  FETCH_BALANCES_BLOCK_INTERVAL,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

let fastLaneMembers: Array<string> = [];

async function getOracleMembers(blockNumber: number): Promise<string[]> {
  const hashConsensus = new ethers.Contract(
    EXITBUS_HASH_CONSENSUS_ADDRESS,
    HASH_CONSENSUS_ABI,
    ethersProvider,
  );

  const members = await hashConsensus.functions.getMembers({
    blockTag: blockNumber,
  });
  return members.addresses;
}

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const hashConsensus = new ethers.Contract(
    EXITBUS_HASH_CONSENSUS_ADDRESS,
    HASH_CONSENSUS_ABI,
    ethersProvider,
  );

  membersAddresses = await getOracleMembers(currentBlock);
  const memberReportReceivedFilter = hashConsensus.filters.ReportReceived();
  // ~14 days ago
  const reportReceivedStartBlock =
    currentBlock - Math.ceil((2 * ONE_WEEK) / SECONDS_PER_SLOT);
  const reportReceivedEvents = await getLogsByChunks(
    hashConsensus,
    memberReportReceivedFilter,
    reportReceivedStartBlock,
    currentBlock - 1,
  );

  membersAddresses.forEach((member: string) => {
    let memberReports = reportReceivedEvents.filter((event) => {
      if (event.args) return event.args.member == member;
    });
    if (memberReports.length > 0) {
      const lastReport = memberReports[memberReports.length - 1];
      if (lastReport.args) {
        membersLastReport.set(member, {
          refSlot: lastReport.args.refSlot,
          report: lastReport.args.report,
          blockNumber: lastReport.blockNumber,
        });
      }
    } else {
      membersLastReport.set(member, {
        refSlot: BN_ZERO,
        report: "",
        blockNumber: 0,
      });
    }
  });

  fastLaneMembers = (
    await hashConsensus.functions.getFastLaneMembers({
      blockTag: currentBlock,
    })
  ).addresses;

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleMembersBalances(blockEvent, findings);

  return findings;
}

async function handleMembersBalances(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  if (blockEvent.blockNumber % FETCH_BALANCES_BLOCK_INTERVAL != 0) return;
  membersAddresses = await getOracleMembers(blockEvent.blockNumber);
  await Promise.all(
    membersAddresses.map((member) =>
      handleMemberBalance(member, blockEvent, findings),
    ),
  );
}

async function handleMemberBalance(
  member: string,
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const now = blockEvent.block.timestamp;
  const lastAlert = membersBalanceLastAlert.get(member) || 0;
  if (now > lastAlert + ONE_WEEK) {
    const balance = new BigNumber(
      String(await ethersProvider.getBalance(member, blockEvent.blockNumber)),
    ).div(ETH_DECIMALS);
    if (balance.isLessThanOrEqualTo(MIN_MEMBER_BALANCE_INFO)) {
      const severity = balance.isLessThanOrEqualTo(MIN_MEMBER_BALANCE_HIGH)
        ? FindingSeverity.High
        : FindingSeverity.Info;
      findings.push(
        Finding.fromObject({
          name: "⚠️ Low balance of ExitBus Oracle Member",
          description:
            `Balance of ${etherscanAddress(member)} ` +
            `(${getMemberName(
              EXITBUS_ORACLE_MEMBERS,
              member.toLocaleLowerCase(),
            )}) is ` +
            `${balance.toFixed(4)} ETH. This is rather low!`,
          alertId: "EXITBUS-ORACLE-MEMBER-LOW-BALANCE",
          severity: severity,
          type: FindingType.Degraded,
          metadata: {
            oracle: member,
            balance: `${balance}`,
          },
        }),
      );
      membersBalanceLastAlert.set(member, now);
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (EXITBUS_HASH_CONSENSUS_ADDRESS in txEvent.addresses) {
    handleReportReceived(txEvent, findings);
    await handleReportSubmitted(txEvent, findings);
  }
  handleEventsOfNotice(
    txEvent,
    findings,
    EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE,
  );

  return findings;
}

function handleReportReceived(txEvent: TransactionEvent, findings: Finding[]) {
  const [event] = txEvent.filterLog(
    EXITBUS_HASH_CONSENSUS_REPORT_RECEIVED_EVENT,
    EXITBUS_HASH_CONSENSUS_ADDRESS,
  );
  if (!event) return;
  const currentReportHashes = [...membersLastReport.values()]
    .filter((r) => r.refSlot.eq(event.args.refSlot))
    .map((r) => r.report);
  const receivedReportNumber = currentReportHashes.length + 1;
  const membersCount = membersAddresses.length;
  if (
    currentReportHashes.length > 0 &&
    !currentReportHashes.includes(event.args.report)
  ) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ ExitBus Oracle: Alternative report received",
        description:
          `Member ${etherscanAddress(event.args.member)} ` +
          `(${getMemberName(
            EXITBUS_ORACLE_MEMBERS,
            event.args.member.toLocaleLowerCase(),
          )}) has reported a hash unmatched by other members.\nReference slot: ${
            event.args.refSlot
          }\n${receivedReportNumber} of ${membersCount} reports received`,
        alertId: "EXITBUS-ORACLE-REPORT-RECEIVED-ALTERNATIVE-HASH",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
      }),
    );
  }
  membersLastReport.set(event.args.member, {
    refSlot: event.args.refSlot,
    report: event.args.report,
    blockNumber: txEvent.blockNumber,
  });
}

async function handleReportSubmitted(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  const [submitted] = txEvent.filterLog(
    EXITBUS_ORACLE_REPORT_SUBMITTED_EVENT,
    EXITBUS_ORACLE_ADDRESS,
  );
  if (!submitted) return;
  const block = txEvent.blockNumber;
  const hashConsensus = new ethers.Contract(
    EXITBUS_HASH_CONSENSUS_ADDRESS,
    HASH_CONSENSUS_ABI,
    ethersProvider,
  );
  // update only on report submission. Move to handleReportSubmitted
  fastLaneMembers = (
    await hashConsensus.functions.getFastLaneMembers({
      blockTag: block,
    })
  ).addresses;
  membersLastReport.forEach((report, member) => {
    const reportDist = block - report.blockNumber;
    const reportDistDays = Math.floor(
      (reportDist * SECONDS_PER_SLOT) / ONE_DAY,
    );
    if (reportDist > MAX_REPORT_SUBMIT_SKIP_BLOCKS_MEDIUM) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ ExitBus Oracle: super sloppy member",
          description:
            `Member ${etherscanAddress(member)} ` +
            `(${getMemberName(
              EXITBUS_ORACLE_MEMBERS,
              member.toLocaleLowerCase(),
            )}) ` +
            `has not reported before the submit for more than 2 weeks` +
            ` or have never reported yet`,
          alertId: "SLOPPY-EXITBUS-ORACLE-MEMBER",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        }),
      );
    } else if (fastLaneMembers.includes(member)) {
      if (reportDist > MAX_REPORT_SUBMIT_SKIP_BLOCKS_INFO) {
        findings.push(
          Finding.fromObject({
            name: "🤔 ExitBus Oracle: sloppy member in fast lane",
            description:
              `Member ${etherscanAddress(member)} ` +
              `(${getMemberName(
                EXITBUS_ORACLE_MEMBERS,
                member.toLocaleLowerCase(),
              )}) ` +
              `in fast lane and has not reported before the submit for more than ${reportDistDays} days`,
            alertId: "SLOPPY-EXITBUS-ORACLE-FASTLANE-MEMBER",
            severity: FindingSeverity.Info,
            type: FindingType.Suspicious,
          }),
        );
      }
    }
  });
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
