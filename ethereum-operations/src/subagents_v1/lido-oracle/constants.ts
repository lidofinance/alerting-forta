import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import {
  EXITBUS_HASH_CONSENSUS_ADDRESS,
  EXITBUS_ORACLE_ADDRESS,
  EXITBUS_ORACLE_PROCESSING_STARTED_EVENT,
} from "../../subagents/exitbus-oracle/constants";
import {
  ACCOUNTING_HASH_CONSENSUS_ADDRESS,
  ACCOUNTING_ORACLE_ADDRESS,
} from "../../subagents/accounting-oracle/constants";

// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5;

export const LIDO_ORACLE_ADDRESS = "0x442af784a788a5bd6f42a01ebe9f287a871243fb";

export const LIDO_ORACLE_COMPLETED_EVENT =
  "event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)";

export const LIDO_ORACLE_BEACON_REPORTED_EVENT =
  "event BeaconReported(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators, address caller)";

// Report with higher than info severity if rewards have decreased more than this percentage relative to previous reports value
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD_MEDIUM = 1;
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD_HIGH = 5;

export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO = Math.floor(
  (60 * 60 * 24 * 7) / 12
); // 1 week
export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM = Math.floor(
  (60 * 60 * 24 * 14) / 12
); // 2 weeks

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_DELAY = 24 * 60 * 60 + 15 * 60; // 24h 15m

export const MIN_ORACLE_BALANCE_INFO = 0.3; // 0.3 ETH

export const MIN_ORACLE_BALANCE_HIGH = 0.15; // 0.15 ETH

export const LIDO_ORACLE_EVENTS_OF_NOTICE = [
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event AllowedBeaconBalanceAnnualRelativeIncreaseSet(uint256 value)",
    alertId: "LIDO-ORACLE-BALANCE-RELATIVE-INCREASE-SET",
    name: "⚠️ Lido Oracle: Allowed Beacon Balance Annual Relative Increase Change",
    description: (args: any) =>
      `Allowed beacon balance annual relative increase was set to ${args.value}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event AllowedBeaconBalanceRelativeDecreaseSet(uint256 value)",
    alertId: "LIDO-ORACLE-BALANCE-RELATIVE-DECREASE-SET",
    name: "⚠️ Lido Oracle: Allowed Beacon Balance Annual Relative Decrease Change",
    description: (args: any) =>
      `Allowed beacon balance annual relative decrease was set to ${args.value}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event BeaconReportReceiverSet(address callback)",
    alertId: "LIDO-ORACLE-BEACON-REPORT-RECEIVER-SET",
    name: "⚠️ Lido Oracle: Beacon Report Receiver Change",
    description: (args: any) =>
      `New beacon report receiver was set to ${args.callback}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event MemberAdded(address member)",
    alertId: "LIDO-ORACLE-MEMBER-ADDED",
    name: "⚠️ Lido Oracle: Member Added",
    description: (args: any) => `New oracle member added: ${args.member}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event MemberRemoved(address member)",
    alertId: "LIDO-ORACLE-MEMBER-REMOVED",
    name: "⚠️ Lido Oracle: Member Removed",
    description: (args: any) => `New oracle member removed: ${args.member}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event QuorumChanged(uint256 quorum)",
    alertId: "LIDO-ORACLE-QUORUM-CHANGED",
    name: "🚨 Lido Oracle: Quorum Changed",
    description: (args: any) => `Quorum size was set to ${args.quorum}`,
    severity: FindingSeverity.High,
  },
];

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
      `Oracle member added: ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "ACCOUNTING-ORACLE-MEMBER-REMOVED",
    name: "⚠️ Accounting Oracle: Member Removed",
    description: (args: any) =>
      `Oracle member removed: ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
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
      `New initial epoch: ${args.newInitialEpoch}\nNew epochs per frame: ${args.newEpochsPerFrame}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event ReportProcessorSet(address indexed processor, address indexed prevProcessor)",
    alertId: "ACCOUNTING-ORACLE-REPORT-PROCESSOR-SET",
    name: "🚨 Accounting Oracle: Report Processor set",
    description: (args: any) =>
      `New report processor: ${args.processor}\nPrev report processor: ${args.prevProcessor}`,
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
    event: "event ProcessingStarted(uint256 indexed refSlot, bytes32 hash)",
    alertId: "ACCOUNTING-ORACLE-PROCESSING-STARTED",
    name: "ℹ️ Accounting Oracle: Processing Started",
    description: (args: any) =>
      `Reference slot: ${args.refSlot}\nHash: ${args.hash}`,
    severity: FindingSeverity.Info,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event ConsensusHashContractSet(address indexed addr, address indexed prevAddr)",
    alertId: "ACCOUNTING-ORACLE-CONSENSUS-HASH-CONTRACT-SET",
    name: "⚠️ Accounting Oracle: Consensus Hash Contract Set",
    description: (args: any) =>
      `New address: ${args.addr}\nPrevious address: ${args.prevAddr}`,
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

export const EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE = [
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)",
    alertId: "EXITBUS-ORACLE-CONSENSUS-REACHED",
    name: "✅ ExitBus Oracle: Consensus reached",
    description: (args: any) =>
      `Reference slot: ${args.refSlot}\nSupport: ${args.support}`,
    severity: FindingSeverity.Info,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberAdded(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "EXITBUS-ORACLE-MEMBER-ADDED",
    name: "⚠️ ExitBus Oracle: Member Added",
    description: (args: any) =>
      `Oracle member added: ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "EXITBUS-ORACLE-MEMBER-REMOVED",
    name: "⚠️ ExitBus Oracle: Member Removed",
    description: (args: any) =>
      `Oracle member removed: ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event QuorumSet(uint256 newQuorum, uint256 totalMembers, uint256 prevQuorum)",
    alertId: "EXITBUS-ORACLE-QUORUM-CHANGED",
    name: "🚨 ExitBus Oracle: Quorum Set",
    description: (args: any) =>
      `Quorum size was set to ${args.newQuorum}\nTotal members: ${args.totalMembers}\nPrevious quorum: ${args.prevQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event: "event FastLaneConfigSet(uint256 fastLaneLengthSlots)",
    alertId: "EXITBUS-ORACLE-FAST-LANE-CONFIG-SET",
    name: "🚨 ExitBus Oracle: Fastlane Config Set",
    description: (args: any) => `New length slots: ${args.fastLaneLengthSlots}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event FrameConfigSet(uint256 newInitialEpoch, uint256 newEpochsPerFrame)",
    alertId: "EXITBUS-ORACLE-FRAME-CONFIG-SET",
    name: "🚨 ExitBus Oracle: Frame Config set",
    description: (args: any) =>
      `New initial epoch: ${args.newInitialEpoch}\nNew epochs per frame: ${args.newEpochsPerFrame}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event ReportProcessorSet(address indexed processor, address indexed prevProcessor)",
    alertId: "EXITBUS-ORACLE-REPORT-PROCESSOR-SET",
    name: "🚨 ExitBus Oracle: Report Processor set",
    description: (args: any) =>
      `New report processor: ${args.processor}\nPrev report processor: ${args.prevProcessor}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event: "event ConsensusLost(uint256 indexed refSlot)",
    alertId: "EXITBUS-ORACLE-REPORT-PROCESSOR-SET",
    name: "🚨 ExitBus Oracle: Consensus lost",
    description: (args: any) => `Reference slot: ${args.refSlot}`,
    severity: FindingSeverity.High,
  },
];

export const EXITBUS_ORACLE_EVENTS_OF_NOTICE = [
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event: EXITBUS_ORACLE_PROCESSING_STARTED_EVENT,
    alertId: "EXITBUS-ORACLE-PROCESSING-STARTED",
    name: "ℹ️ ExitBus Oracle: Processing Started",
    description: (args: any) =>
      `Reference slot: ${args.refSlot}\nHash: ${args.hash}`,
    severity: FindingSeverity.Info,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event:
      "event ConsensusHashContractSet(address indexed addr, address indexed prevAddr)",
    alertId: "EXITBUS-ORACLE-CONSENSUS-HASH-CONTRACT-SET",
    name: "⚠️️ ExitBus Oracle: Consensus Hash Contract Set",
    description: (args: any) =>
      `New address: ${args.addr}\nPrevious address: ${args.prevAddr}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event:
      "event ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)",
    alertId: "EXITBUS-ORACLE-CONSENSUS-VERSION-SET",
    name: "⚠️ ExitBus Oracle: Consensus Version Set",
    description: (args: any) =>
      `New version: ${args.version}\nPrevious version: ${args.prevVersion}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event: "event Resumed()",
    alertId: "EXITBUS-ORACLE-UNPAUSED",
    name: "ℹ️ ExitBus Oracle: contract was unpaused",
    description: (args: any) => "Contract was resumed",
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event: "event Paused(uint256 duration)",
    alertId: "EXITBUS-ORACLE-PAUSED",
    name: "🚨 ExitBus Oracle: contract was paused",
    description: (args: any) =>
      `For ${new BigNumber(args.duration).div(360)} hours`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event: "event WarnProcessingMissed(uint256 indexed refSlot)",
    alertId: "EXITBUS-ORACLE-PROCESSING-MISSED",
    name: "🚨 ExitBus Oracle: Processing Missed",
    description: (args: any) => `Reference slot: ${args.refSlot}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event:
      "event WarnDataIncompleteProcessing(uint256 indexed refSlot, uint256 processedItemsCount, uint256 itemsCount)",
    alertId: "EXITBUS-ORACLE-EXTRA-DATA-INCOMPLETE-PROCESSING",
    name: "🚨 ExitBus Oracle: Data Incomplete Processing",
    description: (args: any) =>
      `Reference slot: ${args.refSlot}\nProcessed items count: ${args.processedItemsCount}\nTotal items count: ${args.itemsCount}`,
    severity: FindingSeverity.High,
  },
];
