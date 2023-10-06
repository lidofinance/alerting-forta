import { FindingSeverity } from "forta-agent";
import { etherscanAddress } from "../../common/utils";
import {
  EASY_TRACK_ADDRESS as easyTrackAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  ONE_DAY,
  STAKING_ROUTER_ADDRESS as srAddress,
} from "../../common/constants";

export const STUCK_PENALTY_ENDED_TRIGGER_PERIOD = ONE_DAY;

export const NODE_OPERATOR_REGISTRY_MODULE_ID = 1;

export const EASY_TRACK_ADDRESS = easyTrackAddress;
export const NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;
export const STAKING_ROUTER_ADDRESS = srAddress;
export const BLOCK_INTERVAL = 100;

export const MOTION_ENACTED_EVENT =
  "event MotionEnacted(uint256 indexed _motionId)";
export const SIGNING_KEY_REMOVED_EVENT =
  "event SigningKeyRemoved(uint256 indexed operatorId, bytes pubkey)";
export const NODE_OPERATOR_VETTED_KEYS_COUNT_EVENT =
  "event VettedSigningKeysCountChanged(uint256 indexed nodeOperatorId, uint256 approvedValidatorsCount)";
export const NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT =
  "event ExitedSigningKeysCountChanged(uint256 indexed nodeOperatorId, uint256 exitedValidatorsCount)";
export const NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT =
  "event StuckPenaltyStateChanged(uint256 indexed nodeOperatorId, uint256 stuckValidatorsCount, uint256 refundedValidatorsCount, uint256 stuckPenaltyEndTimestamp)";

export const NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD = 100;
export const NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD = 5;

export const NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE = [
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event TargetValidatorsCountChanged(uint256 indexed nodeOperatorId, uint256 targetValidatorsCount)",
    alertId: "NODE-OPERATOR-TARGET-VALIDATORS-COUNT-CHANGED",
    name: "⚠️ NO Registry: Node operator target validators count changed",
    description: (args: any) =>
      `Node operator ${args.nodeOperatorId} ` +
      `target validators count changed to ${args.targetValidatorsCount}`,
    severity: FindingSeverity.Medium,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorAdded(uint256 nodeOperatorId, string name, address rewardAddress, uint64 stakingLimit)",
    alertId: "NODE-OPERATOR-ADDED",
    name: "ℹ️ NO Registry: Node operator added",
    description: (args: any) =>
      `Node operator ${args.nodeOperatorId} added\n` +
      `Name: ${args.name}\n` +
      `Reward address: ${etherscanAddress(args.rewardAddress)}\n` +
      `StakingLimit: ${args.stakingLimit}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorActiveSet(uint256 indexed nodeOperatorId, bool active)",
    alertId: "NODE-OPERATOR-ACTIVE-SET",
    name: "ℹ️ NO Registry: Node operator active set",
    description: (args: any, names: Map<number, string>) =>
      `Node operator [${args.nodeOperatorId} ${names.get(
        Number(args.nodeOperatorId),
      )}] active status set to ${args.active}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorNameSet(uint256 indexed nodeOperatorId, string name)",
    alertId: "NODE-OPERATOR-NAME-SET",
    name: "ℹ️ NO Registry: Node operator name set",
    description: (args: any, names: Map<number, string>) =>
      `Node operator [${args.nodeOperatorId} ${names.get(
        Number(args.nodeOperatorId),
      )}] name set to ${args.name}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorRewardAddressSet(uint256 indexed nodeOperatorId, address rewardAddress)",
    alertId: "NODE-OPERATOR-REWARD-ADDRESS-SET",
    name: "ℹ️ NO Registry: Node operator reward address set",
    description: (args: any, names: Map<number, string>) =>
      `Node operator [${args.nodeOperatorId} ${names.get(
        Number(args.nodeOperatorId),
      )}] reward address set to ${etherscanAddress(args.rewardAddress)}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorTotalKeysTrimmed(uint256 indexed nodeOperatorId, uint64 totalKeysTrimmed)",
    alertId: "NODE-OPERATOR-KEYS-TRIMMED",
    name: "⚠️ NO Registry: Node operator total keys trimmed",
    description: (args: any, names: Map<number, string>) =>
      `Node operator [${args.nodeOperatorId}: ${names.get(
        Number(args.nodeOperatorId),
      )}] total keys trimmed ${args.totalKeysTrimmed}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event: "event StakingModuleTypeSet(bytes32 moduleType)",
    alertId: "STAKING-MODULE-TYPE-SET",
    name: "⚠️ NO Registry: Staking module type set",
    description: (args: any) => `Staking module type set to ${args.moduleType}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event: "event LocatorContractSet(address locatorAddress)",
    alertId: "NOR-LOCATOR-CONTRACT-SET",
    name: "⚠️ NO Registry: Locator contract set",
    description: (args: any) =>
      `Locator contract set to ${etherscanAddress(args.locatorAddress)}`,
    severity: FindingSeverity.High,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event: "event StuckPenaltyDelayChanged(uint256 stuckPenaltyDelay)",
    alertId: "NOR-STUCK-PENALTY-DELAY-CHANGED",
    name: "⚠️ NO Registry: Stuck penalty delay changed",
    description: (args: any) =>
      `Stuck penalty delay changed to ${args.stuckPenaltyDelay}`,
    severity: FindingSeverity.High,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorPenalized(address indexed recipientAddress, uint256 sharesPenalizedAmount)",
    alertId: "NOR-NODE-OPERATOR-PENALIZED",
    name: "⚠️ NO Registry: Node operator penalized",
    description: (args: any) =>
      `Node operator ${etherscanAddress(
        args.recipientAddress,
      )} penalized with ${args.sharesPenalizedAmount} shares`,
    severity: FindingSeverity.High,
  },
];
