import BigNumber from "bignumber.js";
import { FindingSeverity, FindingType } from "forta-agent";
import { abbreviateNumber } from "./helpers";

// COMMON CONSTS
export const MATIC_DECIMALS = new BigNumber(10 ** 18);
export const ETH_DECIMALS = new BigNumber(10 ** 18);

export const SECS_PER_BLOCK = 12;

// 1 hour
export const ONE_HOUR = 60 * 60;
// 24 hours
export const FULL_24_HOURS = 24 * 60 * 60;

// ADDRESSES
export const MATIC_TOKEN_ADDRESS = "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0";
export const MATIC_STAKING_NFT_ADDRESS =
  "0x47cbe25bbdb40a774cc37e1da92d10c2c7ec897f";
export const ST_MATIC_TOKEN_ADDRESS =
  "0x9ee91f9f426fa633d227f7a9b000e28b9dfd8599";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x797c1369e578172112526dfcd0d5f9182067c928";
export const PROXY_ADMIN_ADDRESS = "0x0833f5bd45803e05ef54e119a77e463ce6b1a963";
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS =
  "0xa22d223e732a5dcf4ff4529aa9a135293b7258fe";
export const POLYGON_ROOT_CHAIN_PROXY =
  "0x86E4Dc95c7FBdBf52e33D563BbDB00823894C287";
export const POLYGON_STAKE_MANAGER_PROXY =
  "0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908";

export const OWNER_MULTISIG_ADDRESS =
  "0xd65fa54f8df43064dfd8ddf223a446fc638800a9";
export const LIDO_ON_POLYGON_PROXIES = {
  lido_nft_proxy: "0x60a91E2B7A1568f0848f3D43353C453730082E46",
  stMATIC_proxy: "0x9ee91F9f426fA633d227f7a9b000E28b9dfd8599",
  validator_factory_proxy: "0x0a6C933495a7BB768d95f4667B074Dd5b95b78eB",
  node_operator_registry_proxy: "0x797C1369e578172112526dfcD0D5f9182067c928",
};

// Lido of validators ids from Lido Node Operators Registry in order of apperance
export const LIDO_VALIDATORS_IDS: { [k: string]: string } = {
  54: "ShardLabs",
  64: "DSRV",
  117: "Girnaar Nodes",
  34: "HashQuark",
  75: "kytzu",
  79: "Matrix Stake",
};

// EVENT ABIs
export const PROXY_ADMIN_OWNERSHIP_TRANSFERRED_EVENT =
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)";

export const ST_MATIC_DISTRIBUTE_REWARDS_EVENT =
  "event DistributeRewardsEvent(uint256 indexed _amount)";

export const ST_MATIC_REQUEST_WITHDRAWAL_EVENT =
  "event RequestWithdrawEvent(address indexed _from, uint256 indexed _amount)";

export const CHEKPOINT_REWARD_UPDATED_EVENT =
  "event RewardUpdate(uint256 newReward, uint256 oldReward)";

type StMaticAdminEvent = {
  address: string;
  event: string;
  alertId: string;
  name: string;
  description: CallableFunction;
  severity: FindingSeverity;
  type: FindingType;
};

export const ST_MATIC_ADMIN_EVENTS: StMaticAdminEvent[] = [
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event Paused(address account)",
    alertId: "STMATIC-CONTRACT-PAUSED",
    name: "❌ stMATIC: Contract was paused",
    description: (args: any) =>
      `stMATIC contract was paused by ${args.account}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event Unpaused(address account)",
    alertId: "STMATIC-CONTRACT-UNPAUSED",
    name: "✅ stMATIC: Contract was unpaused",
    description: (args: any) =>
      `stMATIC contract was unpaused by ${args.account}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "STMATIC-CONTRACT-ROLE-GRANTED",
    name: "⚠️ stMATIC: RoleGranted",
    description: (args: any) =>
      `Role ${args.role} was granted to ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "STMATIC-CONTRACT-ROLE-REVOKED",
    name: "⚠️ stMATIC: RoleRevoked",
    description: (args: any) =>
      `Role ${args.role} was revoked from ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
    alertId: "STMATIC-CONTRACT-ROLE-ADMIN-CHANGED",
    name: "🚨 stMATIC: RoleAdminChanged",
    description: (args: any) =>
      `Admin role ${args.role} was changed form ${args.previousAdminRole} to ${args.newAdminRole}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Suspicious,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event AdminChanged(address newAdmin)",
    alertId: "STMATIC-CONTRACT-ADMIN-CHANGED",
    name: "🚨 stMATIC: AdminChanged",
    description: (args: any) => `Proxy admin was changed to ${args.newAdmin}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Suspicious,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event Upgraded(address indexed implementation)",
    alertId: "STMATIC-CONTRACT-UPGRADED",
    name: "🚨 stMATIC: Upgraded",
    description: (args: any) =>
      `Implementation for stMATIC contract was changed to ${args.implementation}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: ST_MATIC_DISTRIBUTE_REWARDS_EVENT,
    alertId: "STMATIC-CONTRACT-REWARDS-DISTRIBUTED",
    name: "✅ stMATIC: Rewards distributed",
    description: (args: any) =>
      `Rewards for stMATIC was distributed. Rewards amount ` +
      `${new BigNumber(String(args._amount))
        .div(MATIC_DECIMALS)
        .toFixed(2)} MATIC`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event DelegateEvent(uint256 indexed _amountDelegated, uint256 indexed _remainder)",
    alertId: "STMATIC-CONTRACT-POOLED-MATIC-DELEGATED",
    name: "✅ stMATIC: Pooled MATIC delegated",
    description: (args: any) =>
      `Pooled MATIC was delegated to validators. Delegated amount ` +
      `${abbreviateNumber(
        new BigNumber(String(args._amountDelegated))
          .div(MATIC_DECIMALS)
          .toNumber()
      )}` +
      ` MATIC remained pooled ${args._remainder} wei`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event WithdrawTotalDelegatedEvent(address indexed _from, uint256 indexed _amount)",
    alertId: "STMATIC-WITHDRAW-TOTAL",
    name: "⚠️ Full withdrawal requested for validator",
    description: (args: any) =>
      `Full withdrawal requested for validator ` +
      `${args._from}. Amount ` +
      `${new BigNumber(String(args._amount))
        .div(MATIC_DECIMALS)
        .toFixed(2)} MATIC`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event SetInsuranceAddress(address indexed _newInsuranceAddress)",
    alertId: "STMATIC-SET-INSURANCE",
    name: "⚠️ stMATIC: Insurance address changed",
    description: (args: any) =>
      `Insurance address was changed to ${args._newInsuranceAddress}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event SetNodeOperatorRegistryAddress(address indexed _newNodeOperatorRegistryAddress)",
    alertId: "STMATIC-SET-NO-ADDRESS",
    name: "⚠️ stMATIC: Node operator registry address changed",
    description: (args: any) =>
      `Node operator registry address was changed to ${args._newNodeOperatorRegistryAddress}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event SetDelegationLowerBound(uint256 indexed _delegationLowerBound)",
    alertId: "STMATIC-SET-DELEGATION-LOWER-BOUND",
    name: "⚠️ stMATIC: Delegation lower bound changed",
    description: (args: any) =>
      `Delegation lower bound was changed to ` +
      `${new BigNumber(String(args._delegationLowerBound))
        .div(MATIC_DECIMALS)
        .toFixed(2)} MATIC`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event SetRewardDistributionLowerBound(uint256 oldRewardDistributionLowerBound, uint256 newRewardDistributionLowerBound)",
    alertId: "STMATIC-SET-REWARD-DISTRIBUTION-LOWER-BOUND",
    name: "⚠️ stMATIC: Reward distribution lower bound changed",
    description: (args: any) =>
      `Reward distribution lower bound was changed from ` +
      `${new BigNumber(String(args.oldRewardDistributionLowerBound))
        .div(MATIC_DECIMALS)
        .toFixed(2)} MATIC to ` +
      `${new BigNumber(String(args.newRewardDistributionLowerBound))
        .div(MATIC_DECIMALS)
        .toFixed(2)} MATIC`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event SetLidoNFT(address oldLidoNFT, address newLidoNFT)",
    alertId: "STMATIC-SET-LIDO-NFT",
    name: "🚨 stMATIC: Lido NFT address changed",
    description: (args: any) =>
      `Lido NFT address was changed from ` +
      `${args.oldLidoNFT} to ` +
      `${args.newLidoNFT}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event SetFxStateRootTunnel(address oldFxStateRootTunnel, address newFxStateRootTunnel)",
    alertId: "STMATIC-SET-FX-STATE-ROOT",
    name: "⚠️ stMATIC: FX state root tunnel address changed",
    description: (args: any) =>
      `FX state root tunnel address was changed from ` +
      `${args.oldFxStateRootTunnel} to ` +
      `${args.newFxStateRootTunnel}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event SetDaoAddress(address oldDaoAddress, address newDaoAddress)",
    alertId: "STMATIC-SET-DAO-ADDRESS",
    name: "🚨 stMATIC: DAO address changed",
    description: (args: any) =>
      `DAO address was changed from ` +
      `${args.oldDaoAddress} to ` +
      `${args.newDaoAddress}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Suspicious,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event: "event SetProtocolFee(uint8 oldProtocolFee, uint8 newProtocolFee)",
    alertId: "STMATIC-SET-PROTOCOL-FEE",
    name: "⚠️ stMATIC: Protocol fee changed",
    description: (args: any) =>
      `Protocol fee was changed from ` +
      `${args.oldProtocolFee}% to ` +
      `${args.newProtocolFee}%`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
  {
    address: ST_MATIC_TOKEN_ADDRESS,
    event:
      "event SetFees(uint256 daoFee, uint256 operatorsFee, uint256 insuranceFee)",
    alertId: "STMATIC-SET-PROTOCOL-FEES",
    name: "⚠️ stMATIC: Protocol fee distribution changed",
    description: (args: any) =>
      `Protocol fee distribution set to:\n` +
      `daoFee: ${args.daoFee}%\n` +
      `operatorsFee: ${args.operatorsFee}%\n` +
      `insuranceFee: ${args.insuranceFee}%`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
];

export const NODE_OPERATORS_ADMIN_EVENTS: StMaticAdminEvent[] = [
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event: "event AddNodeOperator(uint256 validatorId, address rewardAddress)",
    alertId: "NO-OPERATOR-ADDED",
    name: "ℹ NOR: Node operator added",
    description: (args: any) =>
      `New node operator added with id ${args.validatorId} and reward address ${args.rewardAddress}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event RemoveNodeOperator(uint256 validatorId, address rewardAddress)",
    alertId: "NO-OPERATOR-REMOVED",
    name: "❌ NOR: Node operator removed",
    description: (args: any) =>
      `Node operator ${args.validatorId} with reward address ${args.rewardAddress} was removed`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event RemoveInvalidNodeOperator(uint256 validatorId, address rewardAddress)",
    alertId: "NO-INVALID-OPERATOR-REMOVED",
    name: "❌ NOR: Invalid node operator removed",
    description: (args: any) =>
      `Invalid node operator ${args.validatorId} with reward address ${args.rewardAddress} was removed`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event: "event ExitNodeOperator(uint256 validatorId, address rewardAddress)",
    alertId: "NO-OPERATOR-EXITED",
    name: "❌ NOR: Node operator exited",
    description: (args: any) =>
      `Node operator ${args.validatorId} with reward address ${args.rewardAddress} exited registry`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event: "event SetStMaticAddress(address oldStMatic, address newStMatic)",
    alertId: "NO-SET-STMATIC-ADDRESS",
    name: "🚨 NOR: stMATIC address changed",
    description: (args: any) =>
      `stMATIC address was changed from ` +
      `${args.oldStMatic} to ` +
      `${args.newStMatic}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Suspicious,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event SetRewardAddress(uint256 validatorId, address oldRewardAddress, address newRewardAddress)",
    alertId: "NO-SET-REWARD-ADDRESS",
    name: "🚨 NOR: Reward address for NO changed",
    description: (args: any) =>
      `Reward address for NO ${args.validatorId} was changed from ` +
      `${args.oldRewardAddress} to ` +
      `${args.newRewardAddress}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Suspicious,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event SetCommissionRate(uint256 oldCommissionRate, uint256 newCommissionRate)",
    alertId: "NO-SET-COMMISSION-RATE",
    name: "⚠️ NOR: Default commission rate changed",
    description: (args: any) =>
      `Default commission rate was changed from ` +
      `${args.oldCommissionRate}% to ` +
      `${args.newCommissionRate}%`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event SetDistanceThreshold(uint256 oldDistanceThreshold, uint256 newDistanceThreshold)",
    alertId: "NO-SET-DISTANCE-THRESHOLD",
    name: "⚠️ NOR: Rebalance distance threshold changed",
    description: (args: any) =>
      `Rebalance distance threshold was changed from ` +
      `${args.oldDistanceThreshold}% to ` +
      `${args.newDistanceThreshold}%`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event SetMinRequestWithdrawRange(uint8 oldMinRequestWithdrawRange, uint8 newMinRequestWithdrawRange)",
    alertId: "NO-SET-MIN-REQ-WD-RANGE",
    name: "⚠️NOR: Rebalance min request withdraw range changed",
    description: (args: any) =>
      `Rebalance min request withdraw range changed was changed from ` +
      `${args.oldMinRequestWithdrawRange}% to ` +
      `${args.newMinRequestWithdrawRange}%`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
  {
    address: NODE_OPERATORS_REGISTRY_ADDRESS,
    event:
      "event SetMaxWithdrawPercentagePerRebalance(uint256 oldMaxWithdrawPercentagePerRebalance, uint256 newMaxWithdrawPercentagePerRebalance)",
    alertId: "NO-SET-MAX-WD-PER",
    name: "⚠️ NOR: Max withdraw percentage per rebalance changed",
    description: (args: any) =>
      `Max withdraw percentage per rebalance changed was changed from ` +
      `${args.oldMaxWithdrawPercentagePerRebalance}% to ` +
      `${args.newMaxWithdrawPercentagePerRebalance}%`,
    severity: FindingSeverity.High,
    type: FindingType.Suspicious,
  },
];

// THRESHOLDS
// 3.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT = 3.1;

// 1.1% MATIC of total pooled MATIC
export const MAX_BUFFERED_MATIC_DAILY_PERCENT = 1.1;

// 25 hours (rewards should be distributed each 24 hours but there is a possible delay due to the gas optimization)
export const MAX_REWARDS_DISTRIBUTION_INTERVAL = 25 * 60 * 60;

// report if curent rewards are less than 90% of previous rewards
export const MAX_REWARDS_DECREASE = 10;
// allowed diff between estimated reward change and the actual one
export const REWARDS_ESTIMATE_TO_ACTUAL_DIFF = 2;

// 48 hours
export const MAX_WITHDRAWALS_WINDOW = 60 * 60 * 24 * 2;
export const MAX_WITHDRAWALS_SUM_PERCENT = 5;

// 0.5 ETH
export const MIN_DEPOSIT_EXECUTOR_BALANCE = 0.5;
