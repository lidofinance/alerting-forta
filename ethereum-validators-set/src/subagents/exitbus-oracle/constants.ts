import { ethers, FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { ONE_HOUR, ONE_WEEK, SECONDS_PER_SLOT } from "../../common/constants";
import { etherscanAddress } from "../../common/utils";
import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  EXITBUS_ORACLE_ADDRESS as ebOracleAddress,
  EXITBUS_HASH_CONSENSUS_ADDRESS as ebHashAddress,
  ORACLE_REPORT_SANITY_CHECKER_ADDRESS as checkerAddress,
  WITHDRAWALS_VAULT_ADDRESS as wdVaultAddress,
  EL_REWARDS_VAULT_ADDRESS as elVaultAddress,
} from "../../common/constants";

export const CL_GENESIS_TIMESTAMP = 1606824023;

// trigger each 20 mins for lasting conditions
export const TRIGGER_PERIOD = 60 * 20;
export const BLOCK_INTERVAL = 100;

export const MAX_EXIT_REPORTS_TO_ACCOUNT_ENOUGH_EXITS = 3;

export const EXITBUS_ORACLE_ADDRESS = ebOracleAddress;
export const EXITBUS_HASH_CONSENSUS_ADDRESS = ebHashAddress;
export const ORACLE_REPORT_SANITY_CHECKER_ADDRESS = checkerAddress;
export const NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;

export const LIDO_STETH_ADDRESS = lidoStethAddress;

export const WITHDRAWALS_QUEUE_ADDRESS = wqAddress;
export const WITHDRAWALS_VAULT_ADDRESS = wdVaultAddress;
export const EL_REWARDS_VAULT_ADDRESS = elVaultAddress;

export const EXITBUS_ORACLE_REPORT_SUBMITTED_EVENT =
  "event ReportSubmitted(uint256 indexed refSlot, bytes32 hash, uint256 processingDeadlineTime)";
export const EXITBUS_ORACLE_PROCESSING_STARTED_EVENT =
  "event ProcessingStarted(uint256 indexed refSlot, bytes32 hash)";

export const EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT =
  "event ValidatorExitRequest(uint256 indexed stakingModuleId, uint256 indexed nodeOperatorId, uint256 indexed validatorIndex, bytes validatorPubkey, uint256 timestamp)";

export const EXITBUS_HASH_CONSENSUS_REPORT_RECEIVED_EVENT =
  "event ReportReceived(uint256 indexed refSlot, address indexed member, bytes32 report)";

export const EXITBUS_ORACLE_MEMBERS = new Map<string, string>([
  ["0x140bd8fbdc884f48da7cb1c09be8a2fadfea776e", "Chorus One"],
  ["0xc79F702202E3A6B0B6310B537E786B9ACAA19BAf", "ChainLayer"],
  ["0x404335bce530400a5814375e7ec1fb55faff3ea2", "Staking Facilities"],
  ["0x007de4a5f7bc37e2f26c0cb2e8a95006ee9b89b5", "P2P Validator"],
  ["0x946d3b081ed19173dc83cd974fc69e1e760b7d78", "Stakefish"],
  ["0xec4bfbaf681eb505b94e4a7849877dc6c600ca3a", "Rated"],
  ["0x61c91ecd902eb56e314bb2d5c5c07785444ea1c8", "bloXroute"],
  ["0x1ca0fec59b86f549e1f1184d97cb47794c8af58d", "Instadapp"],
  ["0xa7410857abbf75043d61ea54e07d57a6eb6ef186", "Kyber Network"],
]);

export const FETCH_BALANCES_BLOCK_INTERVAL = 1000;

export const MAX_REPORT_SUBMIT_SKIP_BLOCKS_INFO = Math.floor(
  ONE_WEEK / SECONDS_PER_SLOT,
);
export const MAX_REPORT_SUBMIT_SKIP_BLOCKS_MEDIUM = Math.floor(
  (2 * ONE_WEEK) / SECONDS_PER_SLOT,
);

export const EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_INFO_THRESHOLD = 8;
export const EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_MEDIUM_HIGH_THRESHOLD = 16;
export const EXIT_REQUESTS_COUNT_THRESHOLD_PERCENT = 0.8;

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_SUBMIT_DELAY = 8 * ONE_HOUR + 15 * 60; // 6h 15m

export const MIN_MEMBER_BALANCE_INFO = 0.3; // 0.3 ETH

export const MIN_MEMBER_BALANCE_HIGH = 0.15; // 0.15 ETH

// every 5th alert will be critical
export const REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER = 5;

export const EXITBUS_HASH_CONSENSUS_EVENTS_OF_NOTICE = [
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberAdded(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "EXITBUS-ORACLE-MEMBER-ADDED",
    name: "⚠️ ExitBus Oracle: Member Added",
    description: (args: any) =>
      `Oracle member added: ${etherscanAddress(args.addr)}\nTotal members: ${
        args.newTotalMembers
      }\nQuorum: ${args.newQuorum}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event:
      "event MemberRemoved(address indexed addr, uint256 newTotalMembers, uint256 newQuorum)",
    alertId: "EXITBUS-ORACLE-MEMBER-REMOVED",
    name: "⚠️ ExitBus Oracle: Member Removed",
    description: (args: any) =>
      `Oracle member removed: ${etherscanAddress(args.addr)}\nTotal members: ${
        args.newTotalMembers
      }\nQuorum: ${args.newQuorum}`,
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
      `New report processor: ${etherscanAddress(
        args.processor,
      )}\nPrev report processor: ${etherscanAddress(args.prevProcessor)}`,
    severity: FindingSeverity.High,
  },
  {
    address: EXITBUS_HASH_CONSENSUS_ADDRESS,
    event: "event ConsensusLost(uint256 indexed refSlot)",
    alertId: "EXITBUS-ORACLE-CONSENSUS-LOST",
    name: "🚨 ExitBus Oracle: Consensus lost",
    description: (args: any) => `Reference slot: ${args.refSlot}`,
    severity: FindingSeverity.High,
  },
];

export const EXITBUS_ORACLE_EVENTS_OF_NOTICE = [
  {
    address: EXITBUS_ORACLE_ADDRESS,
    event:
      "event ConsensusHashContractSet(address indexed addr, address indexed prevAddr)",
    alertId: "EXITBUS-ORACLE-CONSENSUS-HASH-CONTRACT-SET",
    name: "⚠️ ExitBus Oracle: Consensus Hash Contract Set",
    description: (args: any) =>
      `New address: ${etherscanAddress(
        args.addr,
      )}\nPrevious address: ${etherscanAddress(args.prevAddr)}`,
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
      `For ${
        String(args.duration) === String(ethers.constants.MaxUint256)
          ? "inf"
          : new BigNumber(String(args.duration)).div(360)
      } hours`,
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
