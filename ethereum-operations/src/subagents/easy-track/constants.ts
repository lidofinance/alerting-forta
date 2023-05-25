import { FindingSeverity } from "forta-agent";
import { etherscanAddress } from "../../common/utils";

export const INCREASE_STAKING_LIMIT_ADDRESS =
  "0xfebd8fac16de88206d4b18764e826af38546afe0";
export const EVM_SCRIPT_EXECUTOR_ADDRESS =
  "0xfe5986e06210ac1ecc1adcafc0cc7f8d63b3f977";
export const REWARD_PROGRAMS_REGISTRY_ADDRESS =
  "0x3129c041b372ee93a5a8756dc4ec6f154d85bc9a";
export const EASY_TRACK_ADDRESS = "0xf0211b7660680b49de1a7e9f25c65660f0a13fea";
export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";

export const MOTION_ENACTED_EVENT =
  "event MotionEnacted(uint256 indexed _motionId)";
export const MOTION_CREATED_EVENT =
  "event MotionCreated(uint256 indexed _motionId, address _creator, address indexed _evmScriptFactory, bytes _evmScriptCallData, bytes _evmScript)";

export const EASY_TRACK_EVENTS_OF_NOTICE = [
  {
    address: EASY_TRACK_ADDRESS,
    event: "event Paused(address account)",
    alertId: "EASY-TRACK-PAUSED",
    name: "🚨 EasyTrack: EasyTrack contract was paused",
    description: (args: any) =>
      `EasyTrack contract was paused by ${etherscanAddress(args.account)}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: "event Unpaused(address account)",
    alertId: "EASY-TRACK-UNPAUSED",
    name: "✅ EasyTrack: EasyTrack contract was unpaused",
    description: (args: any) =>
      `EasyTrack contract was unpaused by ${etherscanAddress(args.account)}`,
    severity: FindingSeverity.High,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "EASY-TRACK-ROLE-GRANTED",
    name: "🚨 EasyTrack: Role was granted on EasyTrack contract",
    description: (args: any) =>
      `Role ${args.role} was granted to ${etherscanAddress(
        args.account
      )} on EasyTrack contract by ${etherscanAddress(args.sender)}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "EASY-TRACK-ROLE-REVOKED",
    name: "🚨 EasyTrack: Role was revoked on EasyTrack contract",
    description: (args: any) =>
      `Role ${args.role} was revoked from ${etherscanAddress(
        args.account
      )} on EasyTrack contract by ${etherscanAddress(args.sender)}`,
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
      `EasyTrack motion ${args._motionId} was objected by ${etherscanAddress(
        args._objector
      )}`,
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
      "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "REWARD-PROGRAMS-REGISTRY-ROLE-GRANTED",
    name: "🚨 Reward Programs: Role was granted on RewardProgramsRegistry",
    description: (args: any) =>
      `Role ${args.role} was granted by ${etherscanAddress(
        args.account
      )} on RewardProgramsRegistry by ${etherscanAddress(args.sender)}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
    event:
      "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "REWARD-PROGRAMS-REGISTRY-ROLE-REVOKED",
    name: "🚨 Reward Programs: Role was revoked on RewardProgramsRegistry",
    description: (args: any) =>
      `Role ${args.role} was revoked from ${etherscanAddress(
        args.account
      )} on RewardProgramsRegistry by ${etherscanAddress(args.sender)}`,
    severity: FindingSeverity.High,
  },
  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event:
      "event EasyTrackChanged(address indexed _previousEasyTrack, address indexed _newEasyTrack)",
    alertId: "EVM-SCRIPT-EXECUTOR-EASY-TRACK-CHANGED",
    name: "🚨 EasyTrack: EVMScriptExecutor's EasyTrack address changed",
    description: (args: any) =>
      `EVMScriptExecutor's EasyTrack address changed from ${etherscanAddress(
        args._previousEasyTrack
      )} to ${etherscanAddress(args._newEasyTrack)}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "EVM-SCRIPT-EXECUTOR-OWNERSHIP-TRANSFERRED",
    name: "🚨 EasyTrack: EVMScriptExecutor's ownership transferred",
    description: (args: any) =>
      `EVMScriptExecutor's ownership transferred from ${etherscanAddress(
        args.previousOwner
      )} to ${etherscanAddress(args.newOwner)}`,
    severity: FindingSeverity.Critical,
  },
];

export const EASY_TRACK_TYPES_BY_FACTORIES = new Map<string, string>([
  [
    "0xfebd8fac16de88206d4b18764e826af38546afe0",
    "Increase node operator staking limit",
  ],
  ["0x929547490ceb6aeedd7d72f1ab8957c0210b6e51", "Add referral partner"],
  ["0xe9eb838fb3a288bf59e9275ccd7e124fdff88a9c", "Remove referral partner"],
  ["0x54058ee0e0c87ad813c002262cd75b98a7f59218", "Top up referral partner"],
  ["0x1dcfc37719a99d73a0ce25ceecbefbf39938cf2c", "Add recipient (reWARDS)"],
  ["0x00bb68a12180a8f7e20d8422ba9f81c07a19a79e", "Remove recipient (reWARDS)"],
  ["0x85d703b2a4bad713b596c647badac9a1e95bb03d", "Top up recipients (reWARDS)"],
  [
    "0x00caaef11ec545b192f16313f53912e453c91458",
    "Top up recipients (Lego LDO)",
  ],
  [
    "0x0535a67ea2d6d46f85fe568b7eaa91ca16824fec",
    "Top up recipients (Lego DAI)",
  ],
  ["0x84f74733ede9bfd53c1b3ea96338867c94ec313e", "Top up recipients (RCC DAI)"],
  ["0x4e6d3a5023a38ce2c4c5456d3760357fd93a22cd", "Top up recipients (PML DAI)"],
  ["0x67fb97abb9035e2e93a7e3761a0d0571c5d7cd07", "Top up recipients (ATC DAI)"],
  ["0x41F9daC5F89092dD6061E59578A2611849317dc8", "Top up recipients (GAS ETH)"],
  [
    "0x009ffa22ce4388d2f5de128ca8e6fd229a312450",
    "Top up recipients (Referral Program DAI)",
  ],
  ["0xbd2b6dc189eefd51b273f5cb2d99ba1ce565fb8c", "Top up recipients (TRP LDO)"],
  [
    "0x935cb3366faf2cfc415b2099d1f974fd27202b77",
    "Add recipient (stETH reWARDS)",
  ],
  [
    "0x22010d1747cafc370b1f1fbba61022a313c5693b",
    "Remove recipient (stETH reWARDS)",
  ],
  [
    "0x1f2b79fe297b7098875930bba6dd17068103897e",
    "Top up recipients (stETH reWARDS)",
  ],
]);
