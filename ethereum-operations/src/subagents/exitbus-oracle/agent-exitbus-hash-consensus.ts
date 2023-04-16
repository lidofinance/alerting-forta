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

import { byBlockNumberDesc, getMemberName } from "./utils";
import { handleEventsOfNotice, requireWithTier } from "../../common/utils";
import {ETH_DECIMALS, ONE_WEEK, ZERO} from "../../common/constants";

// re-fetched from history on startup
let membersLastReport: Map<string, number> = new Map();
let membersBalanceLastAlert: Map<string, number> = new Map();
let lastReceivedReportHash: string = "";
let lastReceivedReportRefSlot = ZERO;

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
} = requireWithTier<typeof Constants>(module, `./constants`);

async function getOracleMembers(blockNumber: number): Promise<string[]> {
  const hashConsensus = new ethers.Contract(
    EXITBUS_HASH_CONSENSUS_ADDRESS,
    HASH_CONSENSUS_ABI,
    ethersProvider
  );

  const members = await hashConsensus.functions.getMembers({
    blockTag: blockNumber,
  });
  return members.addresses;
}

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const hashConsensus = new ethers.Contract(
    EXITBUS_HASH_CONSENSUS_ADDRESS,
    HASH_CONSENSUS_ABI,
    ethersProvider
  );

  const members = await getOracleMembers(currentBlock);
  const memberReportReceivedFilter = hashConsensus.filters.ReportReceived();
  // ~14 days ago
  const reportReceivedStartBlock =
    currentBlock - Math.ceil((14 * 24 * 60 * 60) / 12);
  const reportReceivedEvents = await hashConsensus.queryFilter(
    memberReportReceivedFilter,
    reportReceivedStartBlock,
    currentBlock - 1
  );

  reportReceivedEvents.sort(byBlockNumberDesc);

  members.forEach((member: string) => {
    let memberReports = reportReceivedEvents.filter((event) => {
      if (event.args) return event.args.member == member;
    });
    if (memberReports.length > 0) {
      membersLastReport.set(member, memberReports[0].blockNumber);
    } else {
      membersLastReport.set(member, 0);
    }
  });

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleMembersBalances(blockEvent, findings)]);

  return findings;
}

async function handleMembersBalances(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const members = await getOracleMembers(blockEvent.blockNumber);
  await Promise.all(
    members.map((member) => handleMemberBalance(member, blockEvent, findings))
  );
}

async function handleMemberBalance(
  member: string,
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  const lastAlert = membersBalanceLastAlert.get(member) || 0;
  if (now > lastAlert + ONE_WEEK) {
    const balance = new BigNumber(
      String(await ethersProvider.getBalance(member, blockEvent.blockNumber))
    ).div(ETH_DECIMALS);
    if (balance.isLessThanOrEqualTo(MIN_MEMBER_BALANCE_INFO)) {
      const severity = balance.isLessThanOrEqualTo(MIN_MEMBER_BALANCE_HIGH)
        ? FindingSeverity.High
        : FindingSeverity.Info;
      findings.push(
        Finding.fromObject({
          name: "⚠️ Low balance of ExitBus Oracle Member",
          description:
            `Balance of ${member} ` +
            `(${getMemberName(
              EXITBUS_ORACLE_MEMBERS,
              member.toLocaleLowerCase()
            )}) is ` +
            `${balance.toFixed(4)} ETH. This is rather low!`,
          alertId: "EXITBUS-ORACLE-MEMBER-LOW-BALANCE",
          severity: severity,
          type: FindingType.Degraded,
          metadata: {
            oracle: member,
            balance: `${balance}`,
          },
        })
      );
      membersBalanceLastAlert.set(member, now);
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (txEvent.to === EXITBUS_HASH_CONSENSUS_ADDRESS) {
    handleReportReceived(txEvent, findings);
    handleReportSubmitted(txEvent, findings);
  }
  handleEventsOfNotice(
    txEvent,
    findings,
    EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE
  );

  return findings;
}

function handleReportReceived(txEvent: TransactionEvent, findings: Finding[]) {
  const [event] = txEvent.filterLog(
    EXITBUS_HASH_CONSENSUS_REPORT_RECEIVED_EVENT,
    EXITBUS_HASH_CONSENSUS_ADDRESS
  );
  if (!event) return;
  membersLastReport.set(event.args.member, txEvent.blockNumber);
  const reportRefSlot = new BigNumber(event.args.refSlot);
  if (
    lastReceivedReportHash != "" &&
    lastReceivedReportHash != event.args.report &&
    lastReceivedReportRefSlot.eq(reportRefSlot)
  ) {
    const member = event.args.member;
    findings.push(
      Finding.fromObject({
        name: "⚠️ ExitBus Oracle: Alternative report hash",
        description:
          `Member ${member} ` +
          `(${getMemberName(
            EXITBUS_ORACLE_MEMBERS,
            member.toLocaleLowerCase()
          )}) ` +
          `has reported a different hash than the previous other member.`,
        alertId: "SLOPPY-EXITBUS-ORACLE-MEMBER",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
      })
    );
  }
  lastReceivedReportRefSlot = new BigNumber(event.args.refSlot);
  lastReceivedReportHash = event.args.report;
}

function handleReportSubmitted(txEvent: TransactionEvent, findings: Finding[]) {
  const [submitted] = txEvent.filterLog(
    EXITBUS_ORACLE_REPORT_SUBMITTED_EVENT,
    EXITBUS_ORACLE_ADDRESS
  );
  if (!submitted) return;
  const block = txEvent.blockNumber;
  membersLastReport.forEach((lastRepBlock, member) => {
    const reportDist = block - lastRepBlock;
    const reportDistDays = Math.floor((reportDist * 12) / (60 * 60 * 24));
    if (reportDist > MAX_REPORT_SUBMIT_SKIP_BLOCKS_MEDIUM) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Super sloppy ExitBus Oracle Member",
          description:
            `Member ${member} ` +
            `(${getMemberName(
              EXITBUS_ORACLE_MEMBERS,
              member.toLocaleLowerCase()
            )}) ` +
            `has not reported before the submit for more than 2 weeks` +
            ` or have never reported yet`,
          alertId: "SLOPPY-EXITBUS-ORACLE-MEMBER",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
    } else if (reportDist > MAX_REPORT_SUBMIT_SKIP_BLOCKS_INFO) {
      findings.push(
        Finding.fromObject({
          name: "🤔 Sloppy ExitBus Oracle Member",
          description:
            `Member ${member} ` +
            `(${getMemberName(
              EXITBUS_ORACLE_MEMBERS,
              member.toLocaleLowerCase()
            )}) ` +
            `has not reported before the submit for more than ${reportDistDays} days`,
          alertId: "SLOPPY-EXITBUS-ORACLE-MEMBER",
          severity: FindingSeverity.Info,
          type: FindingType.Suspicious,
        })
      );
    }
  });
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
