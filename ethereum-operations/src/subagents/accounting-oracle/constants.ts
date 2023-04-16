import { FindingSeverity } from "forta-agent";

// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5;

export const ACCOUNTING_ORACLE_ADDRESS =
  "0x76f358a842defa0e179a8970767cff668fc134d6";
export const ACCOUNTING_HASH_CONSENSUS_ADDRESS =
  "0x8d87a8bcf8d4e542fd396d1c50223301c164417b";

export const ACCOUNTING_ORACLE_REPORT_SUBMITTED_EVENT =
  "event ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)";

export const ACCOUNTING_HASH_CONSENSUS_REPORT_RECEIVED_EVENT =
  "event ReportReceived(uint256 indexed refSlot, address indexed member, bytes32 report)";

export const ACCOUNTING_ORACLE_MEMBERS = new Map<string, string>([
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

export const MAX_BEACON_REPORT_SUBMIT_SKIP_BLOCKS_INFO = Math.floor(
  (60 * 60 * 24 * 7) / 12
); // 1 week
export const MAX_BEACON_REPORT_SUBMIT_SKIP_BLOCKS_MEDIUM = Math.floor(
  (60 * 60 * 24 * 14) / 12
); // 2 weeks

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_SUBMIT_DELAY = 24 * 60 * 60 + 15 * 60; // 24h 15m

export const MIN_ORACLE_BALANCE_INFO = 0.3; // 0.3 ETH

export const MIN_ORACLE_BALANCE_HIGH = 0.15; // 0.15 ETH

export const ACCOUNTING_HASH_CONSENSUS_EVENTS_OF_NOTICE = [
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event ConsensusReached(uint256 indexed refSlot, bytes32 report, uint256 support)",
    alertId: "ACCOUNTING-ORACLE-CONSENSUS-REACHED",
    name: "ℹ️ Accounting Oracle: Consensus reached",
    description: (args: any) =>
      `Reference slot - ${args.refSlot}\nSupport - ${args.support}`,
    severity: FindingSeverity.Info,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event ReportReceived(uint256 indexed refSlot, address indexed member, bytes32 report)",
    alertId: "ACCOUNTING-ORACLE-REPORT-RECEIVED",
    name: "ℹ️ Accounting Oracle: Report received",
    description: (args: any) =>
      `Reference slot - ${args.refSlot}\nMember - ${args.member}`,
    severity: FindingSeverity.Info,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberAdded(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "ACCOUNTING-ORACLE-MEMBER-ADDED",
    name: "ℹ️ Accounting Oracle: Member Added",
    description: (args: any) =>
      `Oracle member added - ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "ACCOUNTING-ORACLE-MEMBER-REMOVED",
    name: "⚠️ Accounting Oracle: Member Removed",
    description: (args: any) =>
      `Oracle member removed - ${args.addr}\nTotal members: ${args.newTotalMembers}\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event QuorumSet(uint256 newQuorum, uint256 totalMembers, uint256 prevQuorum)",
    alertId: "ACCOUNTING-ORACLE-QUORUM-CHANGED",
    name: "🚨 Accounting Oracle: Quorum Set",
    description: (args: any) =>
      `Quorum size was set to ${args.newQuorum}\nTotal members: ${args.totalMembers}\nPrevious quorum: ${args.prevQuorum}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event: "event FastLaneConfigSet(uint256 fastLaneLengthSlots)",
    alertId: "ACCOUNTING-ORACLE-FAST-LANE-CONFIG-SET",
    name: "🚨 Accounting Oracle: Fastlane Config Set",
    description: (args: any) =>
      `New length slots - ${args.fastLaneLengthSlots}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event FrameConfigSet(uint256 newInitialEpoch, uint256 newEpochsPerFrame)",
    alertId: "ACCOUNTING-ORACLE-FRAME-CONFIG-SET",
    name: "🚨 Accounting Oracle: Frame Config set",
    description: (args: any) =>
      `New initial epoch - ${args.newInitialEpoch}\nNew epochs per frame - ${args.newEpochsPerFrame}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event:
      "event ReportProcessorSet(address indexed processor, address indexed prevProcessor)",
    alertId: "ACCOUNTING-ORACLE-REPORT-PROCESSOR-SET",
    name: "🚨 Accounting Oracle: Report Processor set",
    description: (args: any) =>
      `New report processor - ${args.processor}\nPrev report processor - ${args.prevProcessor}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_HASH_CONSENSUS_ADDRESS,
    event: "event ConsensusLost(uint256 indexed refSlot)",
    alertId: "ACCOUNTING-ORACLE-REPORT-PROCESSOR-SET",
    name: "🚨 Accounting Oracle: Consensus lost",
    description: (args: any) => `Reference slot - ${args.refSlot}`,
    severity: FindingSeverity.High,
  },
];

export const ACCOUNTING_ORACLE_EVENTS_OF_NOTICE = [
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)",
    alertId: "ACCOUNTING-ORACLE-REPORT-SUBMITTED",
    name: "ℹ️ Accounting Oracle: Report Submitted",
    description: (args: any) =>
      `Reference slot - ${args.refSlot}\nHash: ${args.hash}`,
    severity: FindingSeverity.Info,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event ProcessingStarted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)",
    alertId: "ACCOUNTING-ORACLE-PROCESSING-STARTED",
    name: "ℹ️ Accounting Oracle: Processing Started",
    description: (args: any) =>
      `Reference slot - ${args.refSlot}\nHash: ${args.hash}`,
    severity: FindingSeverity.Info,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event ConsensusHashContractSet(address indexed addr, address indexed prevAddr)",
    alertId: "ACCOUNTING-ORACLE-CONSENSUS-HASH-CONTRACT-SET",
    name: "ℹ️ Accounting Oracle: Consensus Hash Contract Set",
    description: (args: any) =>
      `New address - ${args.addr}\nPrevious address: ${args.prevAddr}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event ConsensusVersionSet(uint256 indexed version, uint256 indexed prevVersion)",
    alertId: "ACCOUNTING-ORACLE-CONSENSUS-VERSION-SET",
    name: "ℹ️ Accounting Oracle: Consensus Version Set",
    description: (args: any) =>
      `New version - ${args.version}\nPrevious version: ${args.prevVersion}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event: "event WarnProcessingMissed(uint256 indexed refSlot)",
    alertId: "ACCOUNTING-ORACLE-PROCESSING-MISSED",
    name: "🚨 Accounting Oracle: Processing Missed",
    description: (args: any) => `Reference slot - ${args.refSlot}`,
    severity: FindingSeverity.High,
  },
  {
    address: ACCOUNTING_ORACLE_ADDRESS,
    event:
      "event WarnExtraDataIncompleteProcessing(uint256 indexed refSlot, uint256 processedItemsCount, uint256 itemsCount)",
    alertId: "ACCOUNTING-ORACLE-EXTRA-DATA-INCOMPLETE-PROCESSING",
    name: "🚨 Accounting Oracle: Extra Data Incomplete Processing",
    description: (args: any) =>
      `Reference slot - ${args.refSlot}\nProcessed items count: ${args.processedItemsCount}\nTotal items count: ${args.itemsCount}`,
    severity: FindingSeverity.High,
  },
];
