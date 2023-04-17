import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { ONE_HOUR, ONE_WEEK, SECONDS_PER_SLOT } from "../../common/constants";

// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5;

export const EXITBUS_ORACLE_ADDRESS =
  "0xb75a55efab5a8f5224ae93b34b25741edd3da98b";
export const EXITBUS_HASH_CONSENSUS_ADDRESS =
  "0x8374b4ac337d7e367ea1ef54bb29880c3f036a51";

export const EXITBUS_ORACLE_REPORT_SUBMITTED_EVENT =
  "event ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)";
export const EXITBUS_ORACLE_PROCESSING_STARTED_EVENT =
  "event ProcessingStarted(uint256 indexed refSlot, bytes32 hash)";

export const EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT =
  "event ValidatorExitRequest(uint256 indexed stakingModuleId, uint256 indexed nodeOperatorId, uint256 indexed validatorIndex, bytes validatorPubkey, uint256 timestamp)";

export const EXITBUS_HASH_CONSENSUS_REPORT_RECEIVED_EVENT =
  "event ReportReceived(uint256 indexed refSlot, address indexed member, bytes32 report)";

export const EXITBUS_ORACLE_MEMBERS = new Map<string, string>([
  // todo: should be renamed to right names
  ["0x19b1bebe4773fec2496fef8b81a9c175a823844b", "Chorus One"],
  ["0x7eE534a6081d57AFB25b5Cff627d4D26217BB0E9", "Chorus One"],
  ["0x4c75FA734a39f3a21C57e583c1c29942F021C6B7", "Staking Facilities"],
  ["0xA8aF49FB44AAA8EECa9Ae918bb7c05e2E71c9DE9", "P2P Validator"],
  ["0x3799bDA7B884D33F79CEC926af21160dc47fbe05", "Stakefish"],
  ["0x1a13648EE85386cC101d2D7762e2848372068Bc3", "Rated"],
  ["0xb29dD2f6672C0DFF2d2f173087739A42877A5172", "bloXroute"],
  ["0xfdA7E01B2718C511bF016030010572e833C7aE6A", "Instadapp"],
  ["0x81E411f1BFDa43493D7994F82fb61A415F6b8Fd4", "Kyber Network"],
]);

export const MAX_REPORT_SUBMIT_SKIP_BLOCKS_INFO = Math.floor(
  ONE_WEEK / SECONDS_PER_SLOT
);
export const MAX_REPORT_SUBMIT_SKIP_BLOCKS_MEDIUM = Math.floor(
  (2 * ONE_WEEK) / SECONDS_PER_SLOT
);

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_SUBMIT_DELAY = 6 * ONE_HOUR + 15 * 60; // 6h 15m

export const MIN_MEMBER_BALANCE_INFO = 0.3; // 0.3 ETH

export const MIN_MEMBER_BALANCE_HIGH = 0.15; // 0.15 ETH

// every 5th alert will be critical
export const REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER = 5;

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
    name: "ℹ️ ExitBus Oracle: Member Added",
    description: (args: any) =>
      `Oracle member added: ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "EXITBUS-ORACLE-MEMBER-REMOVED",
    name: "⚠️ ExitBus Oracle: Member Removed",
    description: (args: any) =>
      `Oracle member removed: ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event QuorumSet(uint256 newQuorum, uint256 totalMembers, uint256 prevQuorum)",
    alertId: "EXITBUS-ORACLE-QUORUM-CHANGED",
    name: "🚨 ExitBus Oracle: Quorum Set",
    description: (args: any) =>
      `Quorum size was set to ${args.newQuorum}\nTotal members: ${args.totalMembers}\nPrevious quorum: ${args.prevQuorum}`,
    severity: FindingSeverity.High,
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
    name: "ℹ️ ExitBus Oracle: Consensus Hash Contract Set",
    description: (args: any) =>
      `New address: ${args.addr}\nPrevious address: ${args.prevAddr}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event:
      "event ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)",
    alertId: "EXITBUS-ORACLE-CONSENSUS-VERSION-SET",
    name: "ℹ️ ExitBus Oracle: Consensus Version Set",
    description: (args: any) =>
      `New version: ${args.version}\nPrevious version: ${args.prevVersion}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event: "event Resumed()",
    alertId: "EXITBUS-ORACLE-UNPAUSED",
    name: "ℹ️ ExitBus Oracle: contract was unpaused",
    description: (args: any) => "",
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event: "event Paused(uint256 duration)",
    alertId: "EXITBUS-ORACLE-PAUSED",
    name: "🚨 ExitBus Oracle: contract was paused",
    description: (args: any) =>
      `For ${new BigNumber(args.duration).div(360)} hours`,
    severity: FindingSeverity.High,
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
