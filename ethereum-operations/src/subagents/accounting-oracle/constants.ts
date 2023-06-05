import { FindingSeverity } from "forta-agent";
import { ONE_DAY, ONE_WEEK, SECONDS_PER_SLOT } from "../../common/constants";
import { etherscanAddress } from "../../common/utils";
import {
  ACCOUNTING_ORACLE_ADDRESS as accountingOracleAddress,
  ACCOUNTING_HASH_CONSENSUS_ADDRESS as accountingHashConsensusAddress,
} from "../../common/constants";

// trigger each 20 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 20; // 20 minutes

export const ACCOUNTING_ORACLE_ADDRESS = accountingOracleAddress;
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS = accountingHashConsensusAddress;

export const ACCOUNTING_ORACLE_REPORT_SUBMITTED_EVENT =
  "event ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)";

export const ACCOUNTING_HASH_CONSENSUS_REPORT_RECEIVED_EVENT =
  "event ReportReceived(uint256 indexed refSlot, address indexed member, bytes32 report)";

export const ACCOUNTING_ORACLE_MEMBERS = new Map<string, string>([
  ["0x140bd8fbdc884f48da7cb1c09be8a2fadfea776e", "Chorus One"],
  ["0x1d0813bf088be3047d827d98524fbf779bc25f00", "jumpcrypto"],
  ["0x404335bce530400a5814375e7ec1fb55faff3ea2", "Staking Facilities"],
  ["0x007de4a5f7bc37e2f26c0cb2e8a95006ee9b89b5", "P2P Validator"],
  ["0x946d3b081ed19173dc83cd974fc69e1e760b7d78", "Stakefish"],
  ["0xec4bfbaf681eb505b94e4a7849877dc6c600ca3a", "Rated"],
  ["0x61c91ecd902eb56e314bb2d5c5c07785444ea1c8", "bloXroute"],
  ["0x1ca0fec59b86f549e1f1184d97cb47794c8af58d", "Instadapp"],
  ["0xa7410857abbf75043d61ea54e07d57a6eb6ef186", "Kyber Network"],
]);

export const MAX_REPORT_SUBMIT_SKIP_BLOCKS_INFO = Math.floor(
  ONE_WEEK / SECONDS_PER_SLOT
);
export const MAX_REPORT_SUBMIT_SKIP_BLOCKS_MEDIUM = Math.floor(
  (2 * ONE_WEEK) / SECONDS_PER_SLOT
);

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_SUBMIT_DELAY = ONE_DAY + 15 * 60; // 24h 15m

export const MIN_ORACLE_BALANCE_INFO = 0.3; // 0.3 ETH

export const MIN_ORACLE_BALANCE_HIGH = 0.15; // 0.15 ETH

// every 5th alert will be critical
export const REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER = 5;

export const ACCOUNTING_HASH_CONSENSUS_EVENTS_OF_NOTICE = [
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)",
    alertId: "ACCOUNTING-ORACLE-CONSENSUS-REACHED",
    name: "✅ Accounting Oracle: Consensus reached",
    description: (args: any) =>
      `Reference slot: ${args.refSlot}\nSupport: ${args.support}`,
    severity: FindingSeverity.Info,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberAdded(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "ACCOUNTING-ORACLE-MEMBER-ADDED",
    name: "⚠️️ Accounting Oracle: Member Added",
    description: (args: any) =>
      `Oracle member added: ${etherscanAddress(args.addr)}\nTotal members: ${
        args.newTotalMembers
      }\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "ACCOUNTING-ORACLE-MEMBER-REMOVED",
    name: "⚠️ Accounting Oracle: Member Removed",
    description: (args: any) =>
      `Oracle member removed: ${etherscanAddress(args.addr)}\nTotal members: ${
        args.newTotalMembers
      }\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event QuorumSet(uint256 newQuorum, uint256 totalMembers, uint256 prevQuorum)",
    alertId: "ACCOUNTING-ORACLE-QUORUM-CHANGED",
    name: "🚨 Accounting Oracle: Quorum Set",
    description: (args: any) =>
      `Quorum size was set to ${args.newQuorum}\nTotal members: ${args.totalMembers}\nPrevious quorum: ${args.prevQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event: "event FastLaneConfigSet(uint256 fastLaneLengthSlots)",
    alertId: "ACCOUNTING-ORACLE-FAST-LANE-CONFIG-SET",
    name: "🚨 Accounting Oracle: Fastlane Config Set",
    description: (args: any) => `New length slots: ${args.fastLaneLengthSlots}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event FrameConfigSet(uint256 newInitialEpoch, uint256 newEpochsPerFrame)",
    alertId: "ACCOUNTING-ORACLE-FRAME-CONFIG-SET",
    name: "🚨 Accounting Oracle: Frame Config set",
    description: (args: any) =>
      `New initial epoch: ${args.newInitialEpoch}\nNew epochs per frame - ${args.newEpochsPerFrame}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event ReportProcessorSet(address indexed processor, address indexed prevProcessor)",
    alertId: "ACCOUNTING-ORACLE-REPORT-PROCESSOR-SET",
    name: "🚨 Accounting Oracle: Report Processor set",
    description: (args: any) =>
      `New report processor: ${args.processor}\nPrev report processor - ${args.prevProcessor}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event: "event ConsensusLost(uint256 indexed refSlot)",
    alertId: "ACCOUNTING-ORACLE-REPORT-PROCESSOR-SET",
    name: "🚨 Accounting Oracle: Consensus lost",
    description: (args: any) => `Reference slot: ${args.refSlot}`,
    severity: FindingSeverity.High,
  },
];

export const ACCOUNTING_ORACLE_EVENTS_OF_NOTICE = [
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event ConsensusHashContractSet(address indexed addr, address indexed prevAddr)",
    alertId: "ACCOUNTING-ORACLE-CONSENSUS-HASH-CONTRACT-SET",
    name: "⚠️ Accounting Oracle: Consensus Hash Contract Set",
    description: (args: any) =>
      `New address: ${etherscanAddress(
        args.addr
      )}\nPrevious address: ${etherscanAddress(args.prevAddr)}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)",
    alertId: "ACCOUNTING-ORACLE-CONSENSUS-VERSION-SET",
    name: "⚠️ Accounting Oracle: Consensus Version Set",
    description: (args: any) =>
      `New version: ${args.version}\nPrevious version: ${args.prevVersion}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event: "event WarnProcessingMissed(uint256 indexed refSlot)",
    alertId: "ACCOUNTING-ORACLE-PROCESSING-MISSED",
    name: "🚨 Accounting Oracle: Processing Missed",
    description: (args: any) => `Reference slot: ${args.refSlot}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event WarnExtraDataIncompleteProcessing(uint256 indexed refSlot, uint256 processedItemsCount, uint256 itemsCount)",
    alertId: "ACCOUNTING-ORACLE-EXTRA-DATA-INCOMPLETE-PROCESSING",
    name: "🚨 Accounting Oracle: Extra Data Incomplete Processing",
    description: (args: any) =>
      `Reference slot: ${args.refSlot}\nProcessed items count: ${args.processedItemsCount}\nTotal items count: ${args.itemsCount}`,
    severity: FindingSeverity.High,
  },
];
