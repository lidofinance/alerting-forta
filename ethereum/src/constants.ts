import BigNumber from "bignumber.js";
import { FindingSeverity } from "forta-agent";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);
// 1 gwei
export const GWEI_DECIMALS = new BigNumber(10).pow(9);

// ADDRESSES AND EVENTS
export const ANCHOR_VAULT_ADDRESS =
  "0xa2f987a546d4cd1c607ee8141276876c26b72bdf";
export const ANCHOR_DEPOSIT_EVENT =
  "event Deposited (address indexed sender, uint256 amount, bytes32 terra_address, uint256 beth_amount_received)";
export const ANCHOR_WITHDRAW_EVENT =
  "event Withdrawn (address indexed recipient, uint256 amount, uint256 steth_amount_received)";
export const ANCHOR_VAULT_REWARDS_COLLECTED_EVENT =
  "event RewardsCollected(uint256 steth_amount, uint256 ust_amount)";
export const ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT =
  "event SoldStethToUST(uint256 steth_amount, uint256 eth_amount, uint256 usdc_amount, uint256 ust_amount, uint256 steth_eth_price, uint256 eth_usdc_price, uint256 usdc_ust_price)";
// 1000 stETH/bETH
export const MAX_ANCHOR_DEPOSIT_WITHDRAW_AMOUNT = new BigNumber(1000).times(
  ETH_DECIMALS
);
// 0.3 ETH
export const MIN_REWARDS_LIQUIDATOR_ADMIN_BALANCE = new BigNumber(0.3).times(
  ETH_DECIMALS
);
// 4 hours
export const BALANCE_REPORT_WINDOW = 60 * 60 * 4;

export const AAVE_ASTETH_ADDRESS = "0x1982b2f5814301d4e9a8b0201555376e62f82428";
export const AAVE_STABLE_DEBT_STETH_ADDRESS =
  "0x66457616dd8489df5d0afd8678f4a260088aaf55";
export const AAVE_VARIABLE_DEBT_STETH_ADDRESS =
  "0xa9deac9f00dc4310c35603fcd9d34d1a750f81db";
export const AAVE_ATOKEN_MINT_EVENT =
  "event Mint(address indexed from, uint256 value, uint256 index)";
export const AAVE_LANDING_POOL_ADDRESS =
  "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9";

export const DWSTETH_TOKEN_ADDRESS =
  "0x436548baab5ec4d79f669d1b9506d67e98927af7";
export const TRANSFER_EVENT =
  "event Transfer(address indexed _from, address indexed _to, uint256 _value)";

export const LIDO_DAO_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const LDO_TOKEN_ADDRESS = "0x5a98fcbea516cf06857215779fd812ca3bef1b32";
export const LIDO_ORACLE_ADDRESS = "0x442af784a788a5bd6f42a01ebe9f287a871243fb";
export const LIDO_ORACLE_COMPLETED_EVENT =
  "event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)";
export const LIDO_ORACLE_BEACON_REPORTED_EVENT =
  "event BeaconReported(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators, address caller)";

export const LIDO_DEPOSIT_SECURITY_ADDRESS =
  "0xdb149235b6f40dc08810aa69869783be101790e7";
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS =
  "0xf82ac5937a20dc862f9bc0668779031e06000f17";

export const NODE_OPERATORS_REGISTRY_ADDRESS =
  "0x55032650b14df07b85bf18a3a3ec8e0af2e028d5";

export const WSTETH_TOKEN_ADDRESS =
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";

// Report with higher than info severity if rewards have decreased more than this percentage relative to previous reports value
export const LIDO_ORACLE_REWARDS_DIFF_PERCENT_THRESHOLD = 0.5;

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
    name: "Aragon: Vote started",
    description: (args: any) =>
      `Aragon vote ${args.voteId} was started by ${args.creator}\nDetails:\n${args.metadata}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_ARAGON_VOTING_ADDRESS,
    event: "event ExecuteVote(uint256 indexed voteId)",
    alertId: "ARAGON-VOTE-EXECUTED",
    name: "Aragon: Vote executed",
    description: (args: any) => `Aragon vote ${args.voteId} was executed`,
    severity: FindingSeverity.Info,
  },
];

export const EASY_TRACK_ADDRESS = "0xf0211b7660680b49de1a7e9f25c65660f0a13fea";
export const EVM_SCRIPT_EXECUTOR_ADDRESS =
  "0xfe5986e06210ac1ecc1adcafc0cc7f8d63b3f977";
export const REWARD_PROGRAMS_REGISTRY_ADDRESS =
  "0x3129c041b372ee93a5a8756dc4ec6f154d85bc9a";

export const EASY_TRACK_EVENTS_OF_NOTICE = [
  {
    address: EASY_TRACK_ADDRESS,
    event: "event Paused(address account)",
    alertId: "EASY-TRACK-PAUSED",
    name: "EasyTrack: EasyTrack contract was paused",
    description: (args: any) =>
      `EasyTrack contract was paused by ${args.account}`,
    severity: FindingSeverity.High,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: "event Unpaused(address account)",
    alertId: "EASY-TRACK-UNPAUSED",
    name: "EasyTrack: EasyTrack contract was unpaused",
    description: (args: any) =>
      `EasyTrack contract was unpaused by ${args.account}`,
    severity: FindingSeverity.High,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "EASY-TRACK-ROLE-GRANTED",
    name: "EasyTrack: Role was granted on EasyTrack contract",
    description: (args: any) =>
      `Role ${args.role} was granted to ${args.account} on EasyTrack contract by ${args.sender}`,
    severity: FindingSeverity.High,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "EASY-TRACK-ROLE-REVOKED",
    name: "EasyTrack: Role was revoked on EasyTrack contract",
    description: (args: any) =>
      `Role ${args.role} was revoked from ${args.account} on EasyTrack contract by ${args.sender}`,
    severity: FindingSeverity.High,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event MotionCreated(uint256 indexed _motionId, address _creator, address indexed _evmScriptFactory, bytes _evmScriptCallData, bytes _evmScript)",
    alertId: "EASY-TRACK-MOTION-CREATED",
    name: "EasyTrack: New motion created",
    description: (args: any) =>
      `EasyTrack new motion ${args._motionId} created by ${args._creator}`,
    severity: FindingSeverity.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: "event MotionEnacted(uint256 indexed _motionId)",
    alertId: "EASY-TRACK-MOTION-ENACTED",
    name: "EasyTrack: Motion executed",
    description: (args: any) =>
      `EasyTrack motion ${args._motionId} was enacted`,
    severity: FindingSeverity.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event:
      "event MotionObjected(uint256 indexed _motionId, address indexed _objector, uint256 _weight, uint256 _newObjectionsAmount, uint256 _newObjectionsAmountPct)",
    alertId: "EASY-TRACK-MOTION-OBJECTED",
    name: "EasyTrack: Motion objected",
    description: (args: any) =>
      `EasyTrack motion ${args._motionId} was objected by ${args._objector}`,
    severity: FindingSeverity.Info,
  },
  {
    address: EASY_TRACK_ADDRESS,
    event: "event MotionRejected(uint256 indexed _motionId)",
    alertId: "EASY-TRACK-MOTION-REJECTED",
    name: "EasyTrack: Motion rejected",
    description: (args: any) =>
      `EasyTrack motion ${args._motionId} was rejected`,
    severity: FindingSeverity.Info,
  },

  {
    address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
    event:
      "event RoleGranted (bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "REWARD-PROGRAMS-REGISTRY-ROLE-GRANTED",
    name: "EasyTrack: Role was granted on RewardProgramsRegistry",
    description: (args: any) =>
      `Role ${args.role} was granted by ${args.account} on RewardProgramsRegistry by ${args.sender}`,
    severity: FindingSeverity.High,
  },
  {
    address: REWARD_PROGRAMS_REGISTRY_ADDRESS,
    event:
      "event RoleRevoked (bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "REWARD-PROGRAMS-REGISTRY-ROLE-REVOKED",
    name: "EasyTrack: Role was revoked on RewardProgramsRegistry",
    description: (args: any) =>
      `Role ${args.role} was revoked from ${args.account} on RewardProgramsRegistry by ${args.sender}`,
    severity: FindingSeverity.High,
  },

  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event:
      "event EasyTrackChanged(address indexed _previousEasyTrack, address indexed _newEasyTrack)",
    alertId: "EVM-SCRIPT-EXECUTOR-EASY-TRACK-CHANGED",
    name: "EasyTrack: EVMScriptExecutor's EasyTrack address changed",
    description: (args: any) =>
      `EVMScriptExecutor's EasyTrack address changed from ${args._previousEasyTrack} to ${args._newEasyTrack}`,
    severity: FindingSeverity.High,
  },
  {
    address: EVM_SCRIPT_EXECUTOR_ADDRESS,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "EVM-SCRIPT-EXECUTOR-OWNERSHIP-TRANSFERRED",
    name: "EasyTrack: EVMScriptExecutor's ownership transferred",
    description: (args: any) =>
      `EVMScriptExecutor's ownership transferred from ${args.previousOwner} to ${args.newOwner}`,
    severity: FindingSeverity.High,
  },
];

export const LIDO_ORACLE_EVENTS_OF_NOTICE = [
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event AllowedBeaconBalanceAnnualRelativeIncreaseSet(uint256 value)",
    alertId: "LIDO-ORACLE-BALANCE-RELATIVE-INCREASE-SET",
    name: "Lido Oracle: Allowed Beacon Balance Annual Relative Increase Change",
    description: (args: any) =>
      `Allowed beacon balance annual relative increase was set to ${args.value.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event AllowedBeaconBalanceRelativeDecreaseSet(uint256 value)",
    alertId: "LIDO-ORACLE-BALANCE-RELATIVE-DECREASE-SET",
    name: "Lido Oracle: Allowed Beacon Balance Annual Relative Decrease Change",
    description: (args: any) =>
      `Allowed beacon balance annual relative decrease was set to ${args.value.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event BeaconReportReceiverSet(address callback)",
    alertId: "LIDO-ORACLE-BEACON-REPORT-RECEIVER-SET",
    name: "Lido Oracle: Beacon Report Receiver Change",
    description: (args: any) =>
      `New beacon report receiver was set to ${args.callback}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event MemberAdded(address member)",
    alertId: "LIDO-ORACLE-MEMBER-ADDED",
    name: "Lido Oracle: Member Added",
    description: (args: any) => `New oracle member added - ${args.member}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event MemberRemoved(address member)",
    alertId: "LIDO-ORACLE-MEMBER-REMOVED",
    name: "Lido Oracle: Member Removed",
    description: (args: any) => `New oracle member removed - ${args.member}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_ORACLE_ADDRESS,
    event: "event QuorumChanged(uint256 quorum)",
    alertId: "LIDO-ORACLE-QUORUM-CHANGED",
    name: "Lido Oracle: Quorum Changed",
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
    name: "Deposit Security: Deposits paused",
    description: (args: any) => `Deposits were paused by ${args.guardian}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event DepositsUnpaused()",
    alertId: "LIDO-DEPOSITOR-UNPAUSED",
    name: "Deposit Security: Deposits resumed",
    description: (args: any) => `Deposits were resumed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianAdded(address guardian)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-ADDED",
    name: "Deposit Security: Guardian added",
    description: (args: any) => `New guardian added ${args.guardian}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianRemoved(address guardian)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-REMOVED",
    name: "Deposit Security: Guardian removed",
    description: (args: any) => `Guardian ${args.guardian} was removed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianQuorumChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-QUORUM-CHANGED",
    name: "Deposit Security: Guardian quorum changed",
    description: (args: any) => `New quorum size ${args.newValue.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event MaxDepositsChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MAX-DEPOSITS-CHANGED",
    name: "Deposit Security: Max deposits changed",
    description: (args: any) => `New value ${args.newValue.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event MinDepositBlockDistanceChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MIN-DEPOSITS-BLOCK-DISTANCE-CHANGED",
    name: "Deposit Security: Min deposit block distance changed",
    description: (args: any) => `New value ${args.newValue.toFixed()}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event NodeOperatorsRegistryChanged(address newValue)",
    alertId: "LIDO-DEPOSITOR-NO-REGISTRY-CHANGED",
    name: "Deposit Security: Node operators registry changed",
    description: (args: any) => `New node operators registry ${args.newValue}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event OwnerChanged(address newValue)",
    alertId: "LIDO-DEPOSITOR-OWNER-CHANGED",
    name: "Deposit Security: Owner changed",
    description: (args: any) => `New owner ${args.newValue}`,
    severity: FindingSeverity.Critical,
  },
];

export const LIDO_DAO_EVENTS_OF_NOTICE = [
  {
    address: LIDO_DAO_ADDRESS,
    event: "event Stopped()",
    alertId: "LIDO-DAO-STOPPED",
    name: "Lido DAO: Stopped",
    description: (args: any) => `Lido DAO contract was stopped`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event Resumed()",
    alertId: "LIDO-DAO-RESUMED",
    name: "Lido DAO: Resumed",
    description: (args: any) => `Lido DAO contract was resumed`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event FeeSet(uint16 feeBasisPoints)",
    alertId: "LIDO-DAO-FEE-SET",
    name: "Lido DAO: Fee set",
    description: (args: any) =>
      `Lido DAO fee was set to ${args.feeBasisPoints}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event:
      "event FeeDistributionSet(uint16 treasuryFeeBasisPoints, uint16 insuranceFeeBasisPoints, uint16 operatorsFeeBasisPoints)",
    alertId: "LIDO-DAO-FEE-DISTRIBUTION-SET",
    name: "Lido DAO: Fee distribution set",
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
    name: "Lido DAO: Withdrawal Credentials Set",
    description: (args: any) =>
      `Lido DAO withdrawal credentials was set to ${args.withdrawalCredentials}`,
    severity: FindingSeverity.High,
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
export const MAX_ORACLE_REPORT_DELAY = 24 * 60 * 60 + 10 * 60; // 24h 10m

// max delay between oracle report and bETH rewards sell
export const MAX_BETH_REWARDS_SELL_DELAY = 60 * 5; // 5 minutes

// max delay of receipt of funds for Sushi rewards contract
export const MAX_SUSHI_REWARDS_RECEIPT_DELAY = 60 * 10; // 10 minutes

// max delay of receipt of funds for Sushi rewards contract
export const MIN_SUSHI_MANAGER_FUNDS_RECEIPT_MARGIN = 3 * 24 * 60 * 60; // TODO

// max delay of receipt of funds for pool rewards manager contract
export const MAX_DELAY_OF_POOL_REWARDS_PERIOD_PROLONGATION = 10 * 60; // 10 mins

// rewardsAddress is needed only if manager contract doesn't have `period_finish` function
export const POOLS_PARAMS = {
  Curve: {
    managerAddress: "0x753d5167c31fbeb5b49624314d74a957eb271709",
    rewardsAddress: "0x99ac10631f69c753ddb595d074422a0922d9056b",
    poolContractAddress: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  },
};

export const POOLS_PARAMS_BALANCES = {
  Curve: {
    managerAddress: "0x753d5167c31fbeb5b49624314d74a957eb271709",
    rewardsAddress: "0x99ac10631f69c753ddb595d074422a0922d9056b",
    poolContractAddress: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  },
  CurveWethStEth: {
    rewardsAddress: "0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0",
    poolContractAddress: "0x828b154032950c8ff7cf8085d841723db2696056",
  },
  Balancer: {
    managerAddress: "0x1220cccdc9bba5cf626a84586c74d6f940932342",
    rewardsAddress: "",
    vaultContractAddress: "0xba12222222228d8ba445958a75a0704d566bf2c8",
    poolId:
      "0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080",
  },
};

const period10days = 10 * 24 * 60 * 60;
const period5days = 5 * 24 * 60 * 60;
const period3days = 3 * 24 * 60 * 60;
const period2days = 2 * 24 * 60 * 60;

// Must be sorted by period ascending
export const POOL_REWARDS_ALERTS_PERIODS_PARAMS = [
  {
    period: period2days,
    minManagerLdoBalance: "10000",
    description: (poolName: string) =>
      `${poolName} rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
    severity: FindingSeverity.High,
    pools: ["Curve"],
  },
  {
    period: period3days,
    minManagerLdoBalance: "0",
    description: (poolName: string) =>
      `${poolName} rewards period expires in 3 days`,
    severity: FindingSeverity.High,
    pools: ["Curve"],
  },
  {
    period: period5days,
    minManagerLdoBalance: null,
    description: (poolName: string) =>
      `${poolName} rewards period expires in 5 days`,
    severity: FindingSeverity.Info,
    pools: ["Curve"],
  },
  {
    period: period10days,
    minManagerLdoBalance: null,
    description: (poolName: string) =>
      `${poolName} rewards period expires in 10 days`,
    severity: FindingSeverity.Info,
    pools: ["Curve"],
  },
];

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

// 1 gwe1
export const ASTETH_GWEI_DIFFERENCE_THRESHOLD = GWEI_DECIMALS.times(1);

// 10000 astETH
export const MAX_ASTETH_MINT_AMOUNT = 10000;

// all consts in the block bellow are in percents
export const IMBALANCE_TOLERANCE = 10;
export const IMBALANCE_CHANGE_TOLERANCE = 5;
export const POOL_SIZE_CHANGE_TOLERANCE_INFO = 3;
export const POOL_SIZE_CHANGE_TOLERANCE_HIGH = 7;

//! Don't report if time passed since report moment is greater than REPORT_WINDOW
export const POOLS_BALANCES_REPORT_WINDOW = 60 * 60 * 24 * 7; // 1 week

export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_INFO = Math.floor(
  (60 * 60 * 24 * 7) / 13
); // 1 week
export const MAX_BEACON_REPORT_QUORUM_SKIP_BLOCKS_MEDIUM = Math.floor(
  (60 * 60 * 24 * 14) / 13
); // 2 weeks
export const BEACON_REPORT_QUORUM_SKIP_REPORT_WINDOW = 60 * 60 * 24 * 7; // 1 week

export const MIN_ORACLE_BALANCE = 0.3; // 0.3 ETH

export const PEG_REPORT_INTERVAL = 60 * 60 * 24; // 24 hours
export const PEG_STEP_ALERT_MIN_VALUE = 0.98;
export const PEG_STEP = 0.01;
export const PEG_THRESHOLD = 0.9;

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
  ["0xdb149235b6f40dc08810aa69869783be101790e7", "Deposit Security module"],
  ["0x55032650b14df07b85bf18a3a3ec8e0af2e028d5", "Node Operators registry"],
  ["0x442af784a788a5bd6f42a01ebe9f287a871243fb", "Oracle"],
]);

export const LIDO_ROLES = new Map([
  [
    "0xb6d92708f3d4817afc106147d969e229ced5c46e65e0a5002a0d391287762bd0",
    "APP_MANAGER_ROLE",
  ],
  [
    "0x068ca51c9d69625c7add396c98ca4f3b27d894c3b973051ad3ee53017d7094ea",
    "UNSAFELY_MODIFY_VOTE_TIME_ROLE",
  ],
  [
    "0xad15e7261800b4bb73f1b69d3864565ffb1fd00cb93cf14fe48da8f1f2149f39",
    "MODIFY_QUORUM_ROLE",
  ],
  [
    "0xda3972983e62bdf826c4b807c4c9c2b8a941e1f83dfa76d53d6aeac11e1be650",
    "MODIFY_SUPPORT_ROLE",
  ],
  [
    "0xe7dcd7275292e064d090fbc5f3bd7995be23b502c1fed5cd94cfddbbdcd32bbc",
    "CREATE_VOTES_ROLE",
  ],
  [
    "0x2406f1e99f79cea012fb88c5c36566feaeefee0f4b98d3a376b49310222b53c4",
    "ISSUE_ROLE",
  ],
  [
    "0xf5a08927c847d7a29dc35e105208dbde5ce951392105d712761cc5d17440e2ff",
    "ASSIGN_ROLE",
  ],
  [
    "0xe97b137254058bd94f28d2f3eb79e2d34074ffb488d042e3bc958e0a57d2fa22",
    "BURN_ROLE",
  ],
  [
    "0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c3686",
    "MINT_ROLE",
  ],
  [
    "0x95ffc68daedf1eb334cfcd22ee24a5eeb5a8e58aa40679f2ad247a84140f8d6e",
    "REVOKE_VESTINGS_ROLE",
  ],
  [
    "0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc",
    "CREATE_PAYMENTS_ROLE",
  ],
  [
    "0xd35e458bacdd5343c2f050f574554b2f417a8ea38d6a9a65ce2225dbe8bb9a9d",
    "CHANGE_PERIOD_ROLE",
  ],
  [
    "0xd79730e82bfef7d2f9639b9d10bf37ebb662b22ae2211502a00bdf7b2cc3a23a",
    "CHANGE_BUDGETS_ROLE",
  ],
  [
    "0x563165d3eae48bcb0a092543ca070d989169c98357e9a1b324ec5da44bab75fd",
    "EXECUTE_PAYMENTS_ROLE",
  ],
  [
    "0x30597dd103acfaef0649675953d9cb22faadab7e9d9ed57acc1c429d04b80777",
    "MANAGE_PAYMENTS_ROLE",
  ],
  [
    "0x5de467a460382d13defdc02aacddc9c7d6605d6d4e0b8bd2f70732cae8ea17bc",
    "CREATE_PAYMENTS_ROLE",
  ],
  [
    "0x6eb2a499556bfa2872f5aa15812b956cc4a71b4d64eb3553f7073c7e41415aaa",
    "ADD_PROTECTED_TOKEN_ROLE",
  ],
  [
    "0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c",
    "TRANSFER_ROLE",
  ],
  [
    "0xb421f7ad7646747f3051c50c0b8e2377839296cd4973e27f63821d73e390338f",
    "RUN_SCRIPT_ROLE",
  ],
  [
    "0x0a1ad7b87f5846153c6d5a1f761d71c7d0cfd122384f56066cd33239b7933694",
    "SAFE_EXECUTE_ROLE",
  ],
  [
    "0x71eee93d500f6f065e38b27d242a756466a00a52a1dbcd6b4260f01a8640402a",
    "REMOVE_PROTECTED_TOKEN_ROLE",
  ],
  [
    "0x23ce341656c3f14df6692eebd4757791e33662b7dcf9970c8308303da5472b7c",
    "DESIGNATE_SIGNER_ROLE",
  ],
  [
    "0xcebf517aa4440d1d125e0355aae64401211d0848a23c02cc5d29a14822580ba4",
    "EXECUTE_ROLE",
  ],
  [
    "0x0b719b33c83b8e5d300c521cb8b54ae9bd933996a14bef8c2f4e0285d2d2400a",
    "CREATE_PERMISSIONS_ROLE",
  ],
  [
    "0x1f56cfecd3595a2e6cc1a7e6cb0b20df84cdbd92eff2fee554e70e4e45a9a7d8",
    "CREATE_VERSION_ROLE",
  ],
  [
    "0xbf4b1c236312ab76e456c7a8cca624bd2f86c74a4f8e09b3a26d60b1ce492183",
    "SET_NODE_OPERATOR_ADDRESS_ROLE",
  ],
  [
    "0x58412970477f41493548d908d4307dfca38391d6bc001d56ffef86bd4f4a72e8",
    "SET_NODE_OPERATOR_NAME_ROLE",
  ],
  [
    "0xe9367af2d321a2fc8d9c8f1e67f0fc1e2adf2f9844fb89ffa212619c713685b2",
    "ADD_NODE_OPERATOR_ROLE",
  ],
  [
    "0x18ad851afd4930ecc8d243c8869bd91583210624f3f1572e99ee8b450315c80f",
    "REPORT_STOPPED_VALIDATORS_ROLE",
  ],
  [
    "0xd856e115ac9805c675a51831fa7d8ce01c333d666b0e34b3fc29833b7c68936a",
    "SET_NODE_OPERATOR_ACTIVE_ROLE",
  ],
  [
    "0x07b39e0faf2521001ae4e58cb9ffd3840a63e205d288dc9c93c3774f0d794754",
    "SET_NODE_OPERATOR_LIMIT_ROLE",
  ],
  [
    "0xa5ffa9f45fa52c446078e834e1914561bd9c2ab1e833572d62af775da092ccbc",
    "MANAGE_QUORUM",
  ],
  [
    "0xe22a455f1bfbaf705ac3e891a64e156da92cb0b42cfc389158e6e82bd57f37be",
    "SET_BEACON_REPORT_RECEIVER",
  ],
  [
    "0xbf6336045918ae0015f4cdb3441a2fdbfaa4bcde6558c8692aac7f56c69fb067",
    "MANAGE_MEMBERS",
  ],
  [
    "0x16a273d48baf8111397316e6d961e6836913acb23b181e6c5fb35ec0bd2648fc",
    "SET_BEACON_SPEC",
  ],
  [
    "0x44adaee26c92733e57241cb0b26ffaa2d182ed7120ba3ecd7e0dce3635c01dc1",
    "SET_REPORT_BOUNDARIES",
  ],
]);

export const SET_PERMISSION_EVENT =
  "event SetPermission(address indexed entity, address indexed app, bytes32 indexed role, bool allowed)";
export const SET_PERMISSION_PARAMS_EVENT =
  "event SetPermissionParams (address indexed entity, address indexed app, bytes32 indexed role, bytes32 paramsHash)";
export const CHANGE_PERMISSION_MANAGER_EVENT =
  "event ChangePermissionManager(address indexed app, bytes32 indexed role, address indexed manager)";
