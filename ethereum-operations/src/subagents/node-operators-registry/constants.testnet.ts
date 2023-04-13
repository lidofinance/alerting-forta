import { FindingSeverity } from "forta-agent";

export const EASY_TRACK_ADDRESS = "0xAf072C8D368E4DD4A9d4fF6A76693887d6ae92Af";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x9D4AF1Ee19Dad8857db3a45B0374c81c8A1C6320";

export const MOTION_ENACTED_EVENT =
  "event MotionEnacted(uint256 indexed _motionId)";

export const SIGNING_KEY_REMOVED_EVENT =
  "event SigningKeyRemoved(uint256 indexed operatorId, bytes pubkey)";

export const NODE_OPERATOR_STAKING_LIMIT_SET_EVENT =
  "event NodeOperatorStakingLimitSet(uint256 indexed id, uint64 stakingLimit)";

export const NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE = [
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorAdded(uint256 id, string name, address rewardAddress, uint64 stakingLimit)",
    alertId: "NODE-OPERATOR-ADDED",
    name: "ℹ NO Registry: Node operator added",
    description: (args: any) =>
      `Node operator ${args.id} added\n` +
      `Name: ${args.name}\n` +
      `Reward address: ${args.rewardAddress}\n` +
      `StakingLimit: ${args.stakingLimit}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event: "event NodeOperatorActiveSet(uint256 indexed id, bool active)",
    alertId: "NODE-OPERATOR-ACTIVE-SET",
    name: "ℹ NO Registry: Node operator active set",
    description: (args: any) =>
      `Node operator ${args.id} active status set to ${args.active}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorRewardAddressSet(uint256 indexed id, address rewardAddress)",
    alertId: "NODE-OPERATOR-REWARD-ADDRESS-SET",
    name: "ℹ NO Registry: Node operator reward address set",
    description: (args: any) =>
      `Node operator ${args.id} reward address set to ${args.rewardAddress}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorTotalStoppedValidatorsReported(uint256 indexed id, uint64 totalStopped)",
    alertId: "NODE-OPERATOR-STOPPED-VALIDATORS",
    name: "ℹ NO Registry: Node operator total stopped validators reported",
    description: (args: any) =>
      `Node operator ${args.id} total stooped validators ${args.totalStopped}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorTotalKeysTrimmed(uint256 indexed id, uint64 totalKeysTrimmed)",
    alertId: "NODE-OPERATOR-KEYS-TRIMMED",
    name: "⚠️ NO Registry: Node operator total keys trimmed",
    description: (args: any) =>
      `Node operator ${args.id} total keys trimmed ${args.totalKeysTrimmed}`,
    severity: FindingSeverity.Info,
  },
];
