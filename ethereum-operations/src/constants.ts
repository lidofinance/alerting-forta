import BigNumber from "bignumber.js";
import { FindingSeverity } from "forta-agent";

export interface ERC20 {
  decimals: number;
  name: string;
}

// COMMON CONSTS

// 1 hour

export const ONE_HOUR = 60 * 60;

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

// ADDRESSES AND EVENTS
export const LIDO_DAO_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const LIDO_ORACLE_ADDRESS = "0x442af784a788a5bd6f42a01ebe9f287a871243fb";
export const LIDO_ORACLE_COMPLETED_EVENT =
  "event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)";
export const LIDO_ORACLE_BEACON_REPORTED_EVENT =
  "event BeaconReported(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators, address caller)";
export const LIDO_EL_REWARDS_VAULT_ADDRESS =
  "0x388c818ca8b9251b393131c08a736a67ccb19297";
export const MEV_ALLOWED_LIST_ADDRESS =
  "0xf95f069f9ad107938f6ba802a3da87892298610e";

export const LIDO_DEPOSIT_SECURITY_ADDRESS =
  "0xdb149235b6f40dc08810aa69869783be101790e7";
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS =
  "0xf82ac5937a20dc862f9bc0668779031e06000f17";

export const LIDO_INSURANCE_FUND_ADDRESS =
  "0x8b3f33234abd88493c0cd28de33d583b70bede35";

export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";

export const KNOWN_ERC20 = new Map<string, ERC20>([
  [
    "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    { decimals: 18, name: "stETH" },
  ],
  [
    "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    { decimals: 18, name: "wstETH" },
  ],
  ["0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", { decimals: 18, name: "LDO" }],
  ["0x6B175474E89094C44Da98b954EedeAC495271d0F", { decimals: 18, name: "DAI" }],
  ["0xdAC17F958D2ee523a2206206994597C13D831ec7", { decimals: 6, name: "USDT" }],
  ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", { decimals: 6, name: "USDC" }],
]);

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

export const SIGNING_KEY_REMOVED_EVENT =
  "event SigningKeyRemoved(uint256 indexed operatorId, bytes pubkey)";
export const NODE_OPERATOR_STAKING_LIMIT_SET_EVENT =
  "event NodeOperatorStakingLimitSet(uint256 indexed id, uint64 stakingLimit)";

// Report with higher than info severity if rewards have decreased more than this percentage relative to previous reports value
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD = 1;

export const LIDO_ARAGON_ACL_ADDRESS =
  "0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb";
export const LIDO_ARAGON_VOTING_ADDRESS =
  "0x2e59a20f205bb85a89c53f1936454680651e618e";
export const CAST_VOTE_EVENT =
  "event CastVote(uint256 indexed voteId, address indexed voter, bool supports, uint256 stake)";

export const ARAGON_VOTING_EVENTS_OF_NOTICE = [
  {
    address: LIDO_ARAGON_VOTING_ADDRESS,
    event:
      "event StartVote(uint256 indexed voteId, address indexed creator, string metadata)",
    alertId: "ARAGON-VOTE-STARTED",
    name: "🚀 Aragon: Vote started",
    description: (args: any) =>
      `Aragon vote ${args.voteId} was started by ${args.creator}\nDetails:\n${args.metadata}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_ARAGON_VOTING_ADDRESS,
    event: "event ExecuteVote(uint256 indexed voteId)",
    alertId: "ARAGON-VOTE-EXECUTED",
    name: "✅ Aragon: Vote executed",
    description: (args: any) => `Aragon vote ${args.voteId} was executed`,
    severity: FindingSeverity.Info,
  },
];

export const EASY_TRACK_ADDRESS = "0xf0211b7660680b49de1a7e9f25c65660f0a13fea";
export const MOTION_ENACTED_EVENT =
  "event MotionEnacted(uint256 indexed _motionId)";
export const MOTION_CREATED_EVENT =
  "event MotionCreated(uint256 indexed _motionId, address _creator, address indexed _evmScriptFactory, bytes _evmScriptCallData, bytes _evmScript)";
export const EVM_SCRIPT_EXECUTOR_ADDRESS =
  "0xfe5986e06210ac1ecc1adcafc0cc7f8d63b3f977";
export const REWARD_PROGRAMS_REGISTRY_ADDRESS =
  "0x3129c041b372ee93a5a8756dc4ec6f154d85bc9a";
export const INCREASE_STAKING_LIMIT_ADDRESS =
  "0xfebd8fac16de88206d4b18764e826af38546afe0";

export const EASY_TRACK_EVENTS_OF_NOTICE = [
  {
    address: EASY_TRACK_ADDRESS,
    event: "event Paused(address account)",
    alertId: "EASY-TRACK-PAUSED",
    name: "🚨 EasyTrack: EasyTrack contract was paused",
    description: (args: any) =>
      `EasyTrack contract was paused by ${args.account}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: "event Unpaused(address account)",
    alertId: "EASY-TRACK-UNPAUSED",
    name: "✅ EasyTrack: EasyTrack contract was unpaused",
    description: (args: any) =>
      `EasyTrack contract was unpaused by ${args.account}`,
    severity: FindingSeverity.High,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "EASY-TRACK-ROLE-GRANTED",
    name: "🚨 EasyTrack: Role was granted on EasyTrack contract",
    description: (args: any) =>
      `Role ${args.role} was granted to ${args.account} on EasyTrack contract by ${args.sender}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "EASY-TRACK-ROLE-REVOKED",
    name: "🚨 EasyTrack: Role was revoked on EasyTrack contract",
    description: (args: any) =>
      `Role ${args.role} was revoked from ${args.account} on EasyTrack contract by ${args.sender}`,
    severity: FindingSeverity.High,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: MOTION_ENACTED_EVENT,
    alertId: "EASY-TRACK-MOTION-ENACTED",
    name: "✅ EasyTrack: Motion executed",
    description: (args: any) =>
      `EasyTrack motion ${args._motionId} was enacted`,
    severity: FindingSeverity.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event MotionObjected(uint256 indexed _motionId, address indexed _objector, uint256 _weight, uint256 _newObjectionsAmount, uint256 _newObjectionsAmountPct)",
    alertId: "EASY-TRACK-MOTION-OBJECTED",
    name: "ℹ️ EasyTrack: Motion objected",
    description: (args: any) =>
      `EasyTrack motion ${args._motionId} was objected by ${args._objector}`,
    severity: FindingSeverity.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: "event MotionRejected(uint256 indexed _motionId)",
    alertId: "EASY-TRACK-MOTION-REJECTED",
    name: "❌ EasyTrack: Motion rejected",
    description: (args: any) =>
      `EasyTrack motion ${args._motionId} was rejected`,
    severity: FindingSeverity.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: "event MotionCanceled(uint256 indexed _motionId)",
    alertId: "EASY-TRACK-MOTION-CANCELED",
    name: "❌ EasyTrack: Motion canceled",
    description: (args: any) =>
      `EasyTrack motion ${args._motionId} was canceled`,
    severity: FindingSeverity.Info,
  },

  {
    address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
    event:
      "event RoleGranted (bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "REWARD-PROGRAMS-REGISTRY-ROLE-GRANTED",
    name: "🚨 EasyTrack: Role was granted on RewardProgramsRegistry",
    description: (args: any) =>
      `Role ${args.role} was granted by ${args.account} on RewardProgramsRegistry by ${args.sender}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
    event:
      "event RoleRevoked (bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "REWARD-PROGRAMS-REGISTRY-ROLE-REVOKED",
    name: "🚨 EasyTrack: Role was revoked on RewardProgramsRegistry",
    description: (args: any) =>
      `Role ${args.role} was revoked from ${args.account} on RewardProgramsRegistry by ${args.sender}`,
    severity: FindingSeverity.High,
  },

  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event:
      "event EasyTrackChanged(address indexed _previousEasyTrack, address indexed _newEasyTrack)",
    alertId: "EVM-SCRIPT-EXECUTOR-EASY-TRACK-CHANGED",
    name: "🚨 EasyTrack: EVMScriptExecutor's EasyTrack address changed",
    description: (args: any) =>
      `EVMScriptExecutor's EasyTrack address changed from ${args._previousEasyTrack} to ${args._newEasyTrack}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "EVM-SCRIPT-EXECUTOR-OWNERSHIP-TRANSFERRED",
    name: "🚨 EasyTrack: EVMScriptExecutor's ownership transferred",
    description: (args: any) =>
      `EVMScriptExecutor's ownership transferred from ${args.previousOwner} to ${args.newOwner}`,
    severity: FindingSeverity.Critical,
  },
];

export const LIDO_ORACLE_EVENTS_OF_NOTICE = [
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event AllowedBeaconBalanceAnnualRelativeIncreaseSet(uint256 value)",
    alertId: "LIDO-ORACLE-BALANCE-RELATIVE-INCREASE-SET",
    name: "⚠️ Lido Oracle: Allowed Beacon Balance Annual Relative Increase Change",
    description: (args: any) =>
      `Allowed beacon balance annual relative increase was set to ${args.value.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event AllowedBeaconBalanceRelativeDecreaseSet(uint256 value)",
    alertId: "LIDO-ORACLE-BALANCE-RELATIVE-DECREASE-SET",
    name: "⚠️ Lido Oracle: Allowed Beacon Balance Annual Relative Decrease Change",
    description: (args: any) =>
      `Allowed beacon balance annual relative decrease was set to ${args.value.toFixed()}`,
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
    name: "ℹ️ Lido Oracle: Member Added",
    description: (args: any) => `New oracle member added - ${args.member}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event MemberRemoved(address member)",
    alertId: "LIDO-ORACLE-MEMBER-REMOVED",
    name: "⚠️ Lido Oracle: Member Removed",
    description: (args: any) => `New oracle member removed - ${args.member}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event QuorumChanged(uint256 quorum)",
    alertId: "LIDO-ORACLE-QUORUM-CHANGED",
    name: "🚨 Lido Oracle: Quorum Changed",
    description: (args: any) =>
      `Quorum size was set to ${args.quorum.toFixed()}`,
    severity: FindingSeverity.High,
  },
];

export const DEPOSIT_SECURITY_EVENTS_OF_NOTICE = [
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event DepositsPaused(address guardian)",
    alertId: "LIDO-DEPOSITOR-PAUSED",
    name: "🚨 Deposit Security: Deposits paused",
    description: (args: any) => `Deposits were paused by ${args.guardian}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event DepositsUnpaused()",
    alertId: "LIDO-DEPOSITOR-UNPAUSED",
    name: "✅ Deposit Security: Deposits resumed",
    description: (args: any) => `Deposits were resumed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianAdded(address guardian)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-ADDED",
    name: "⚠️ Deposit Security: Guardian added",
    description: (args: any) => `New guardian added ${args.guardian}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianRemoved(address guardian)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-REMOVED",
    name: "⚠️ Deposit Security: Guardian removed",
    description: (args: any) => `Guardian ${args.guardian} was removed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianQuorumChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-QUORUM-CHANGED",
    name: "🚨 Deposit Security: Guardian quorum changed",
    description: (args: any) => `New quorum size ${args.newValue.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event MaxDepositsChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MAX-DEPOSITS-CHANGED",
    name: "⚠️ Deposit Security: Max deposits changed",
    description: (args: any) => `New value ${args.newValue.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event MinDepositBlockDistanceChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MIN-DEPOSITS-BLOCK-DISTANCE-CHANGED",
    name: "⚠️ Deposit Security: Min deposit block distance changed",
    description: (args: any) => `New value ${args.newValue.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event NodeOperatorsRegistryChanged(address newValue)",
    alertId: "LIDO-DEPOSITOR-NO-REGISTRY-CHANGED",
    name: "⚠️ Deposit Security: Node operators registry changed",
    description: (args: any) => `New node operators registry ${args.newValue}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event OwnerChanged(address newValue)",
    alertId: "LIDO-DEPOSITOR-OWNER-CHANGED",
    name: "🚨 Deposit Security: Owner changed",
    description: (args: any) => `New owner ${args.newValue}`,
    severity: FindingSeverity.Critical,
  },
];

export const LIDO_DAO_EVENTS_OF_NOTICE = [
  {
    address: LIDO_DAO_ADDRESS,
    event: "event Stopped()",
    alertId: "LIDO-DAO-STOPPED",
    name: "🚨🚨🚨 Lido DAO: Stopped 🚨🚨🚨",
    description: (args: any) => `Lido DAO contract was stopped`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event Resumed()",
    alertId: "LIDO-DAO-RESUMED",
    name: "✅ Lido DAO: Resumed",
    description: (args: any) => `Lido DAO contract was resumed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event FeeSet(uint16 feeBasisPoints)",
    alertId: "LIDO-DAO-FEE-SET",
    name: "⚠️ Lido DAO: Fee set",
    description: (args: any) =>
      `Lido DAO fee was set to ${args.feeBasisPoints}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event:
      "event FeeDistributionSet(uint16 treasuryFeeBasisPoints, uint16 insuranceFeeBasisPoints, uint16 operatorsFeeBasisPoints)",
    alertId: "LIDO-DAO-FEE-DISTRIBUTION-SET",
    name: "⚠️ Lido DAO: Fee distribution set",
    description: (args: any) =>
      `Lido DAO fee distribution was set to\n` +
      `treasuryFeeBasisPoints:${args.treasuryFeeBasisPoints}\n` +
      `insuranceFeeBasisPoints:${args.insuranceFeeBasisPoints}\n` +
      `operatorsFeeBasisPoints:${args.operatorsFeeBasisPoints}\n`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event WithdrawalCredentialsSet(bytes32 withdrawalCredentials)",
    alertId: "LIDO-DAO-WD-CREDS-SET",
    name: "🚨🚨🚨 Lido DAO: Withdrawal Credentials Set",
    description: (args: any) =>
      `Lido DAO withdrawal credentials was set to ${args.withdrawalCredentials}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event StakingPaused()",
    alertId: "LIDO-DAO-STAKING-PAUSED",
    name: "🚨 Lido DAO: Staking paused",
    description: (args: any) => `Staking was paused!`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event StakingResumed()",
    alertId: "LIDO-DAO-STAKING-RESUMED",
    name: "✅ Lido DAO: Staking resumed",
    description: (args: any) => `Staking was resumed!`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event:
      "event StakingLimitSet(uint256 maxStakeLimit, uint256 stakeLimitIncreasePerBlock)",
    alertId: "LIDO-DAO-STAKING-LIMIT-SET",
    name: "⚠️ Lido DAO: Staking limit set",
    description: (args: any) =>
      `Staking limit was set with:\n` +
      `Max staking limit: ${args.maxStakeLimit.toFixed()}\n` +
      `Stake limit increase per block: ${args.stakeLimitIncreasePerBlock.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event StakingLimitRemoved()",
    alertId: "LIDO-DAO-STAKING-LIMIT-REMOVED",
    name: "🚨 Lido DAO: Staking limit removed",
    description: (args: any) => `Staking limit was removed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event:
      "event ProtocolContactsSet(address oracle, address treasury, address insuranceFund)",
    alertId: "LIDO-DAO-PROTOCOL-CONTRACT-SET",
    name: "🚨 Lido DAO: Protocol contracts set",
    description: (args: any) =>
      `Protocol contracts were set to:\n` +
      `Oracle: ${args.oracle}\n` +
      `Treasury: ${args.treasury}\n` +
      `Insurance fund: ${args.insuranceFund}\n`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event ELRewardsReceived(uint256 amount)",
    alertId: "LIDO-DAO-EL-REWARDS-RECEIVED",
    name: "✅ Lido DAO: EL rewards received",
    description: (args: any) =>
      `Rewards amount: ${new BigNumber(String(args.amount))
        .div(ETH_DECIMALS)
        .toFixed(2)} ETH`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event ELRewardsWithdrawalLimitSet(uint256 limitPoints)",
    alertId: "LIDO-DAO-EL-REWARDS-WD-LIMIT-SET",
    name: "⚠️ Lido DAO: EL rewards withdrawal limit set",
    description: (args: any) =>
      `Limit: ${args.limitPoints.toNumber()} BP ` +
      `(${args.limitPoints.toNumber() / 100}%)`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event ELRewardsVaultSet(address executionLayerRewardsVault)",
    alertId: "LIDO-DAO-EL-REWARDS-VAULT-SET",
    name: "🚨 Lido DAO: EL rewards vault set",
    description: (args: any) => `Vault: ${args.executionLayerRewardsVault} ETH`,
    severity: FindingSeverity.Info,
  },
];

export const MEV_ALLOWED_LIST_EVENTS_OF_NOTICE = [
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event:
      "event RelayAdded (string indexed uri_hash, (string uri, string operator, bool is_mandatory, string description) relay)",
    alertId: "MEV-RELAY-ADDED",
    name: "ℹ️ MEV Allowed list: Relay added",
    description: (args: any) =>
      `New MEV relay added.\n` +
      `URI: ${args.relay.uri}\n` +
      `Operator: ${args.relay.operator}\n` +
      `Mandatory: ${args.relay.is_mandatory}\n` +
      `Description: ${args.relay.description}`,
    severity: FindingSeverity.Info,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event: "event RelayRemoved (string indexed uri_hash, string uri)",
    alertId: "MEV-RELAY-REMOVED",
    name: "⚠️ MEV Allowed list: Relay removed",
    description: (args: any) => `MEV relay removed.\nURI: ${args.uri}`,
    severity: FindingSeverity.Info,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event: "event AllowedListUpdated (uint256 indexed allowed_list_version)",
    alertId: "MEV-LIST-VERSION-UPDATED",
    name: "ℹ️ MEV Allowed list: Version updated",
    description: (args: any) =>
      `MEV allowed list version updated.\n` +
      `New version: ${args.allowed_list_version}`,
    severity: FindingSeverity.Info,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event:
      "event ERC20Recovered (address indexed token, uint256 amount, address indexed recipient)",
    alertId: "MEV-ERC20-RECOVERED",
    name: "⚠️ MEV Allowed list: ERC20 Recovered",
    description: (args: any) =>
      `ERC20 tokens were recovered from MEV allowed list contract.\n` +
      `Token: ${args.token}\n` +
      `Amount: ${args.amount.toFixed(0)}\n` +
      `Recipient: ${args.recipient}`,
    severity: FindingSeverity.Info,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event: "event OwnerChanged (uint256 indexed new_owner)",
    alertId: "MEV-LIST-OWNER-CHANGED",
    name: "🚨 MEV Allowed list: Owner changed",
    description: (args: any) =>
      `MEV allowed list owner has changed.\nNew owner: ${args.new_owner}`,
    severity: FindingSeverity.High,
  },
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event: "event ManagerChanged (uint256 indexed new_manager)",
    alertId: "MEV-LIST-MANAGER-CHANGED",
    name: "🚨 MEV Allowed list: Manager changed",
    description: (args: any) =>
      `MEV allowed list manager has changed.\n` +
      `New manager: ${args.new_manager}`,
    severity: FindingSeverity.High,
  },
];

export const INSURANCE_FUND_EVENTS_OF_NOTICE = [
  {
    address: LIDO_INSURANCE_FUND_ADDRESS,
    event:
      "event EtherTransferred(address indexed _recipient, uint256 _amount)",
    alertId: "INS-FUND-ETH-TRANSFERRED",
    name: "⚠️ Insurance fund: ETH transferred",
    description: (args: any) =>
      `${new BigNumber(String(args._amount))
        .div(ETH_DECIMALS)
        .toFixed(2)} ETH were transferred from insurance fund to ${
        args._recipient
      }`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_INSURANCE_FUND_ADDRESS,
    event:
      "event ERC721Transferred(address indexed _token, address indexed _recipient, uint256 _tokenId, bytes _data)",
    alertId: "INS-FUND-ERC721-TRANSFERRED",
    name: "⚠️ Insurance fund: ERC721 transferred",
    description: (args: any) =>
      `ERC721 token (address: ${args._token}, id: ${args._tokenId}) was transferred form insurance fund to ${args._recipient}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_INSURANCE_FUND_ADDRESS,
    event:
      "event ERC20Transferred(address indexed _token, address indexed _recipient, uint256 _amount)",
    alertId: "INS-FUND-ERC20-TRANSFERRED",
    name: "🚨 Insurance fund: ERC20 transferred",
    description: (args: any) => {
      const tokenInfo = KNOWN_ERC20.get(args._token.toLowerCase()) || {
        decimals: 18,
        name: "unknown",
      };
      return `${new BigNumber(String(args._amount))
        .div(10 ** tokenInfo.decimals)
        .toFixed(2)} of ${args._token}(${
        tokenInfo.name
      }) were transferred from insurance fund to ${args._recipient}`;
    },
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_INSURANCE_FUND_ADDRESS,
    event:
      "event ERC1155Transferred(address indexed _token, address indexed _recipient, uint256 _tokenId, uint256 _amount, bytes _data)",
    alertId: "INS-FUND-ERC1155-TRANSFERRED",
    name: "⚠️ Insurance fund: ERC1155 transferred",
    description: (args: any) =>
      `${args._amount} of ERC1155 token (address: ${args._token}, id: ${args._tokenId}) was transferred form insurance fund to ${args._recipient}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_INSURANCE_FUND_ADDRESS,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "INS-FUND-OWNERSHIP-TRANSFERRED",
    name: "🚨 Insurance fund: Ownership transferred",
    description: (args: any) =>
      `Owner of the insurance fund was transferred from ${args.previousOwner} to ${args.newOwner}`,
    severity: FindingSeverity.Critical,
  },
];

// Proxy-watcher consts
export const implementationFuncShortABI =
  '[{"constant":true,"inputs":[],"name":"implementation","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]';
export interface IProxyContractData {
  name: string;
  shortABI: string;
}

export const LIDO_PROXY_CONTRACTS_DATA: Map<string, IProxyContractData> =
  new Map<string, IProxyContractData>([
    [
      "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      {
        name: "Lido DAO and stETH",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5",
      {
        name: "Lido: Node Operators Registry",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x55032650b14df07b85bF18A3a3eC8E0Af2e028d5",
      {
        name: "Lido: Oracle",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xB9D7934878B5FB9610B3fE8A5e441e8fad7E293f",
      {
        name: "Lido: Withdrawals Manager Stub",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xb8FFC3Cd6e7Cf5a098A1c92F48009765B24088Dc",
      {
        name: "Lido: Deployer 2",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x2e59A20f205bB85a89C53f1936454680651E618e",
      {
        name: "Lido: Aragon Voting",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xf73a1260d222f447210581DDf212D915c09a3249",
      {
        name: "Lido: Aragon Token Manager",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xB9E5CBB9CA5b0d659238807E84D0176930753d86",
      {
        name: "Lido: Aragon Finance",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c",
      {
        name: "Lido: Treasury",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x9895F0F17cc1d1891b6f18ee0b483B6f221b37Bb",
      {
        name: "Lido: Aragon ACL",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xF9339DE629973c60c4d2b76749c81E6F40960E3A",
      {
        name: "Lido: Lido Oracle Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xF5Dc67E54FC96F993CD06073f71ca732C1E654B1",
      {
        name: "Lido: Lido App Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x0D97E876ad14DB2b183CFeEB8aa1A5C788eB1831",
      {
        name: "Lido: Node Operators Registry Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0x4Ee3118E3858E8D7164A634825BfE0F73d99C792",
      {
        name: "Lido: Voting Repo",
        shortABI: implementationFuncShortABI,
      },
    ],
    [
      "0xAb55Bf4DfBf469ebfe082b7872557D1F87692Fe6",
      {
        name: "Lido: stETH Price Feed",
        shortABI:
          '[{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]',
      },
    ],
    [
      "0xA2F987A546D4CD1c607Ee8141276876C26b72Bdf",
      {
        name: "Anchor Protocol: AnchorVault",
        shortABI:
          '[{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]',
      },
    ],
  ]);

// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5;

// max delay between two oracle reports
export const MAX_ORACLE_REPORT_DELAY = 24 * 60 * 60 + 15 * 60; // 24h 15m

export const MIN_AVAILABLE_KEYS_COUNT = 1000;

// 5000 ETH
export const MAX_BUFFERED_ETH_AMOUNT_CRITICAL = 5000;

// 2000 ETH
export const MAX_BUFFERED_ETH_AMOUNT_MEDIUM = 2000;

// 2 ETH
export const MIN_DEPOSIT_EXECUTOR_BALANCE = 2;

// 72 hours
export const MAX_DEPOSITOR_TX_DELAY = 60 * 60 * 72;

// 1 hour
export const MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME = 60 * 60;

export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO = Math.floor(
  (60 * 60 * 24 * 7) / 12
); // 1 week
export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM = Math.floor(
  (60 * 60 * 24 * 14) / 12
); // 2 weeks

export const MIN_ORACLE_BALANCE_INFO = 0.3; // 0.3 ETH

export const MIN_ORACLE_BALANCE_HIGH = 0.15; // 0.15 ETH

export const LIDO_APPS = new Map([
  ["0xb8ffc3cd6e7cf5a098a1c92f48009765b24088dc", "Lido DAO"],
  ["0x5a98fcbea516cf06857215779fd812ca3bef1b32", "LDO token"],
  ["0x2e59a20f205bb85a89c53f1936454680651e618e", "Aragon Voting"],
  ["0xf73a1260d222f447210581ddf212d915c09a3249", "Aragon Token Manager"],
  ["0xb9e5cbb9ca5b0d659238807e84d0176930753d86", "Aragon Finance"],
  ["0x3e40d73eb977dc6a537af587d48316fee66e9c8c", "Aragon Agent"],
  ["0x9895f0f17cc1d1891b6f18ee0b483b6f221b37bb", "Aragon ACL"],
  ["0xf5dc67e54fc96f993cd06073f71ca732c1e654b1", "Lido App Repo"],
  ["0xf9339de629973c60c4d2b76749c81e6f40960e3a", "Lido Oracle Repo"],
  ["0x0d97e876ad14db2b183cfeeb8aa1a5c788eb1831", "NO registry Repo"],
  ["0x4ee3118e3858e8d7164a634825bfe0f73d99c792", "Voting Repo"],
  ["0xfe5986e06210ac1ecc1adcafc0cc7f8d63b3f977", "EVMScriptExecutor"],
  ["0x710b3303fb508a84f10793c1106e32be873c24cd", "Deposit Security module"],
  ["0x55032650b14df07b85bf18a3a3ec8e0af2e028d5", "Node Operators registry"],
  ["0x442af784a788a5bd6f42a01ebe9f287a871243fb", "Oracle"],
  ["0xae7ab96520de3a18e5e111b5eaab095312d7fe84", "stETH token"],
  ["0xa9b2f5ce3aae7374a62313473a74c98baa7fa70e", "LDO purchase executor"],
  ["0xb280e33812c0b09353180e92e27b8ad399b07f26", "SelfOwnedStETHBurner"],
]);

export const ORDINARY_ENTITIES = new Map([
  ["0x2e59a20f205bb85a89c53f1936454680651e618e", "Aragon Voting"],
  ["0x3e40d73eb977dc6a537af587d48316fee66e9c8c", "Aragon Agent"],
]);

// i.e. keccak256("APP_MANAGER_ROLE")
export const LIDO_ROLES = new Map([
  [
    "0xb6d92708f3d4817afc106147d969e229ced5c46e65e0a5002a0d391287762bd0",
    "APP MANAGER ROLE",
  ],
  [
    "0x068ca51c9d69625c7add396c98ca4f3b27d894c3b973051ad3ee53017d7094ea",
    "UNSAFELY MODIFY VOTE TIME ROLE",
  ],
  [
    "0xad15e7261800b4bb73f1b69d3864565ffb1fd00cb93cf14fe48da8f1f2149f39",
    "MODIFY QUORUM ROLE",
  ],
  [
    "0xda3972983e62bdf826c4b807c4c9c2b8a941e1f83dfa76d53d6aeac11e1be650",
    "MODIFY SUPPORT ROLE",
  ],
  [
    "0xe7dcd7275292e064d090fbc5f3bd7995be23b502c1fed5cd94cfddbbdcd32bbc",
    "CREATE VOTES ROLE",
  ],
  [
    "0x2406f1e99f79cea012fb88c5c36566feaeefee0f4b98d3a376b49310222b53c4",
    "ISSUE ROLE",
  ],
  [
    "0xf5a08927c847d7a29dc35e105208dbde5ce951392105d712761cc5d17440e2ff",
    "ASSIGN ROLE",
  ],
  [
    "0xe97b137254058bd94f28d2f3eb79e2d34074ffb488d042e3bc958e0a57d2fa22",
    "BURN ROLE",
  ],
  [
    "0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c3686",
    "MINT ROLE",
  ],
  [
    "0x95ffc68daedf1eb334cfcd22ee24a5eeb5a8e58aa40679f2ad247a84140f8d6e",
    "REVOKE VESTINGS ROLE",
  ],
  [
    "0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc",
    "CREATE PAYMENTS ROLE",
  ],
  [
    "0xd35e458bacdd5343c2f050f574554b2f417a8ea38d6a9a65ce2225dbe8bb9a9d",
    "CHANGE PERIOD ROLE",
  ],
  [
    "0xd79730e82bfef7d2f9639b9d10bf37ebb662b22ae2211502a00bdf7b2cc3a23a",
    "CHANGE BUDGETS ROLE",
  ],
  [
    "0x563165d3eae48bcb0a092543ca070d989169c98357e9a1b324ec5da44bab75fd",
    "EXECUTE PAYMENTS ROLE",
  ],
  [
    "0x30597dd103acfaef0649675953d9cb22faadab7e9d9ed57acc1c429d04b80777",
    "MANAGE PAYMENTS ROLE",
  ],
  [
    "0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc",
    "CREATE PAYMENTS ROLE",
  ],
  [
    "0x6eb2a499556bfa2872f5aa15812b956cc4a71b4d64eb3553f7073c7e41415aaa",
    "ADD PROTECTED TOKEN ROLE",
  ],
  [
    "0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c",
    "TRANSFER ROLE",
  ],
  [
    "0xb421f7ad7646747f3051c50c0b8e2377839296cd4973e27f63821d73e390338f",
    "RUN SCRIPT ROLE",
  ],
  [
    "0x0a1ad7b87f5846153c6d5a1f761d71c7d0cfd122384f56066cd33239b7933694",
    "SAFE EXECUTE ROLE",
  ],
  [
    "0x71eee93d500f6f065e38b27d242a756466a00a52a1dbcd6b4260f01a8640402a",
    "REMOVE PROTECTED TOKEN ROLE",
  ],
  [
    "0x23ce341656c3f14df6692eebd4757791e33662b7dcf9970c8308303da5472b7c",
    "DESIGNATE SIGNER ROLE",
  ],
  [
    "0xcebf517aa4440d1d125e0355aae64401211d0848a23c02cc5d29a14822580ba4",
    "EXECUTE ROLE",
  ],
  [
    "0x0b719b33c83b8e5d300c521cb8b54ae9bd933996a14bef8c2f4e0285d2d2400a",
    "CREATE PERMISSIONS ROLE",
  ],
  [
    "0x1f56cfecd3595a2e6cc1a7e6cb0b20df84cdbd92eff2fee554e70e4e45a9a7d8",
    "CREATE VERSION ROLE",
  ],
  [
    "0xbf4b1c236312ab76e456c7a8cca624bd2f86c74a4f8e09b3a26d60b1ce492183",
    "SET NODE OPERATOR ADDRESS ROLE",
  ],
  [
    "0x58412970477f41493548d908d4307dfca38391d6bc001d56ffef86bd4f4a72e8",
    "SET NODE OPERATOR NAME ROLE",
  ],
  [
    "0xe9367af2d321a2fc8d9c8f1e67f0fc1e2adf2f9844fb89ffa212619c713685b2",
    "ADD NODE OPERATOR ROLE",
  ],
  [
    "0x18ad851afd4930ecc8d243c8869bd91583210624f3f1572e99ee8b450315c80f",
    "REPORT STOPPED VALIDATORS ROLE",
  ],
  [
    "0xd856e115ac9805c675a51831fa7d8ce01c333d666b0e34b3fc29833b7c68936a",
    "SET NODE OPERATOR ACTIVE ROLE",
  ],
  [
    "0x07b39e0faf2521001ae4e58cb9ffd3840a63e205d288dc9c93c3774f0d794754",
    "SET NODE OPERATOR LIMIT ROLE",
  ],
  [
    "0xa5ffa9f45fa52c446078e834e1914561bd9c2ab1e833572d62af775da092ccbc",
    "MANAGE QUORUM",
  ],
  [
    "0xe22a455f1bfbaf705ac3e891a64e156da92cb0b42cfc389158e6e82bd57f37be",
    "SET BEACON REPORT RECEIVER",
  ],
  [
    "0xbf6336045918ae0015f4cdb3441a2fdbfaa4bcde6558c8692aac7f56c69fb067",
    "MANAGE MEMBERS",
  ],
  [
    "0x16a273d48baf8111397316e6d961e6836913acb23b181e6c5fb35ec0bd2648fc",
    "SET BEACON SPEC",
  ],
  [
    "0x44adaee26c92733e57241cb0b26ffaa2d182ed7120ba3ecd7e0dce3635c01dc1",
    "SET REPORT BOUNDARIES",
  ],
  [
    "0x2fc10cc8ae19568712f7a176fb4978616a610650813c9d05326c34abb62749c7",
    "RESUME ROLE",
  ],
  [
    "0x84ea57490227bc2be925c684e2a367071d69890b629590198f4125a018eb1de8",
    "STAKING PAUSE ROLE",
  ],
  [
    "0xa42eee1333c0758ba72be38e728b6dadb32ea767de5b4ddbaea1dae85b1b051f",
    "STAKING CONTROL ROLE",
  ],
  [
    "0xeb7bfce47948ec1179e2358171d5ee7c821994c911519349b95313b685109031",
    "MANAGE PROTOCOL CONTRACTS ROLE",
  ],
  [
    "0x9d68ad53a92b6f44b2e8fb18d211bf8ccb1114f6fafd56aa364515dfdf23c44f",
    "SET EL REWARDS VAULT ROLE",
  ],
  [
    "0xca7d176c2da2028ed06be7e3b9457e6419ae0744dc311989e9b29f6a1ceb1003",
    "SET EL REWARDS WITHDRAWAL LIMIT ROLE",
  ],
  [
    "0x2561bf26f818282a3be40719542054d2173eb0d38539e8a8d3cff22f29fd2384",
    "DEPOSIT ROLE",
  ],
]);

export const SET_PERMISSION_EVENT =
  "event SetPermission(address indexed entity, address indexed app, bytes32 indexed role, bool allowed)";
export const SET_PERMISSION_PARAMS_EVENT =
  "event SetPermissionParams (address indexed entity, address indexed app, bytes32 indexed role, bytes32 paramsHash)";
export const CHANGE_PERMISSION_MANAGER_EVENT =
  "event ChangePermissionManager(address indexed app, bytes32 indexed role, address indexed manager)";

interface IOwnable {
  name: string;
  ownershipMethod: string;
}

// Rewards contracts allowed owners
export const WHITELISTED_OWNERS = [
  "0x2e59A20f205bB85a89C53f1936454680651E618e",
  "0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c",
  // multisigs
  "0x73b047fe6337183A454c5217241D780a932777bD",
  "0x3cd9F71F80AB08ea5a7Dca348B5e94BC595f26A0",
];

// List of contracts to monitor for owner
export const OWNABLE_CONTRACTS = new Map<string, IOwnable>([
  [
    "0x710B3303fB508a84F10793c1106e32bE873C24cd",
    {
      name: "Deposit Security module",
      ownershipMethod: "getOwner",
    },
  ],
  [
    "0x753D5167C31fBEB5b49624314d74A957Eb271709",
    {
      name: "Curve Liquidity Farming Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    "0x6140182B2536AE7B6Cfcfb2d2bAB0f6Fe0D7b58E",
    {
      name: "ARCx Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    "0xE5576eB1dD4aA524D67Cf9a32C8742540252b6F4",
    {
      name: "SushiSwap LP Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    "0x75ff3dd673Ef9fC459A52E1054db5dF2A1101212",
    {
      name: "SushiSwap LP Reward",
      ownershipMethod: "owner",
    },
  ],
  [
    "0x1220ccCDc9BBA5CF626a84586C74D6f940932342",
    {
      name: "Balancer LP v2 Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    "0x86F6c353A0965eB069cD7f4f91C1aFEf8C725551",
    {
      name: "Balancer LP v3 Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    "0xf5436129Cf9d8fa2a1cb6e591347155276550635",
    {
      name: "1inch LP Reward Manager",
      ownershipMethod: "owner",
    },
  ],
  [
    "0xA2F987A546D4CD1c607Ee8141276876C26b72Bdf",
    {
      name: "AnchorVault",
      ownershipMethod: "admin",
    },
  ],
  [
    "0xFE5986E06210aC1eCC1aDCafc0cc7f8D63B3F977",
    {
      name: "Easy Track EVMScriptExecutor",
      ownershipMethod: "owner",
    },
  ],
]);

export const NEW_OWNER_IS_CONTRACT_REPORT_INTERVAL = 24 * 60 * 60; // 24h
export const NEW_OWNER_IS_EOA_REPORT_INTERVAL = 60 * 60; // 1h
