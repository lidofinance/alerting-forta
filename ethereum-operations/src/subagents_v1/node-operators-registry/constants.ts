import { FindingSeverity } from "forta-agent";
import { NODE_OPERATORS_REGISTRY_ADDRESS } from "../../common/constants";

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
    name: "ℹ️ NO Registry: Node operator added",
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
    name: "ℹ️ NO Registry: Node operator active set",
    description: (args: any) =>
      `Node operator ${args.id} active status set to ${args.active}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorNameSet(uint256 indexed nodeOperatorId, string name)",
    alertId: "NODE-OPERATOR-NAME-SET",
    name: "ℹ️ NO Registry: Node operator name set",
    description: (args: any) =>
      `Node operator ${args.id} name set to ${args.name}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorRewardAddressSet(uint256 indexed nodeOperatorId, address rewardAddress)",
    alertId: "NODE-OPERATOR-REWARD-ADDRESS-SET",
    name: "ℹ️ NO Registry: Node operator reward address set",
    description: (args: any) =>
      `Node operator ${args.id} reward address set to ${args.rewardAddress}`,
    severity: FindingSeverity.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event NodeOperatorTotalKeysTrimmed(uint256 indexed nodeOperatorId, uint64 totalKeysTrimmed)",
    alertId: "NODE-OPERATOR-KEYS-TRIMMED",
    name: "⚠️ NO Registry: Node operator total keys trimmed",
    description: (args: any) =>
      `Node operator ${args.id} total keys trimmed ${args.totalKeysTrimmed}`,
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
      `Locator contract set to ${args.locatorAddress}`,
    severity: FindingSeverity.High,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event VettedSigningKeysCountChanged(uint256 indexed nodeOperatorId, uint256 approvedValidatorsCount)",
    alertId: "NOR-VETTED-SIGNING-KEYS-COUNT-CHANGED",
    name: "⚠️ NO Registry: Vetted signing keys count changed",
    description: (args: any) =>
      `Node operator ${args.nodeOperatorId} vetted signing keys count changed to ${args.approvedValidatorsCount}`,
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
      `Node operator ${args.recipientAddress} penalized with ${args.sharesPenalizedAmount} shares`,
    severity: FindingSeverity.High,
  },
];
