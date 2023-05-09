import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { ETH_DECIMALS } from "../../common/constants";

export interface ERC20 {
  decimals: number;
  name: string;
}

// 24 hours
export const REPORT_WINDOW = 60 * 60 * 24;
// 4 hours
export const REPORT_WINDOW_EXECUTOR_BALANCE = 60 * 60 * 4;
// 12 hours
export const REPORT_WINDOW_STAKING_LIMIT_30 = 60 * 60 * 12;
// 12 hours
export const REPORT_WINDOW_STAKING_LIMIT_10 = 60 * 60 * 12;
// 24 hours
export const MEV_RELAY_COUNT_THRESHOLD_HIGH = 2;
export const MEV_RELAY_COUNT_THRESHOLD_INFO = 4;
// 24 hours
export const MEV_RELAY_COUNT_REPORT_WINDOW = 60 * 60 * 24;

export const LIDO_DAO_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const LIDO_DEPOSIT_SECURITY_ADDRESS =
  "0xc77f8768774e1c9244beed705c4354f2113cfc09";
export const LIDO_DEPOSIT_EXECUTOR_ADDRESS =
  "0xf82ac5937a20dc862f9bc0668779031e06000f17";
export const MEV_ALLOWED_LIST_ADDRESS =
  "0xf95f069f9ad107938f6ba802a3da87892298610e";
export const LIDO_INSURANCE_FUND_ADDRESS =
  "0x8b3f33234abd88493c0cd28de33d583b70bede35";
export const LIDO_BURNER_ADDRESS = "0xD15a672319Cf0352560eE76d9e89eAB0889046D3";
export const TRP_FACTORY_ADDRESS = "0xDA1DF6442aFD2EC36aBEa91029794B9b2156ADD0";
export const ENS_BASE_REGISTRAR_ADDRESS =
  "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85";
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

export const MIN_AVAILABLE_KEYS_COUNT = 1000;

// 2 ETH
export const MIN_DEPOSIT_EXECUTOR_BALANCE = 2;

// 2000 ETH
export const MAX_BUFFERED_ETH_AMOUNT_MEDIUM = 2000;

// 5000 ETH
export const MAX_BUFFERED_ETH_AMOUNT_CRITICAL = 5000;

// 1 hour
export const MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME = 60 * 60;

// 72 hours
export const MAX_DEPOSITOR_TX_DELAY = 60 * 60 * 72;

// approx 1 week
export const ENS_CHECK_INTERVAL = 50_000;

export const LIDO_ENS_NAMES = [
  "lido",
  "steth",
  "staked",
  "lidopm",
  "lido-dao",
  "unst",
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
      `Max staking limit: ${args.maxStakeLimit}\n` +
      `Stake limit increase per block: ${args.stakeLimitIncreasePerBlock}`,
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
      `Insurance fund: ${args.insuranceFund}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event LidoLocatorSet(address lidoLocator)",
    alertId: "LIDO-DAO-LOCATOR-SET",
    name: "🚨 Lido DAO: Locator set",
    description: (args: any) => `Lido locator was set to: ${args.lidoLocator}`,
    severity: FindingSeverity.Critical,
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
    event: "event WithdrawalsReceived(uint256 amount)",
    alertId: "LIDO-DAO-WITHDRAWALS-RECEIVED",
    name: "✅ Lido DAO: Withdrawals received",
    description: (args: any) =>
      `Withdrawals amount: ${new BigNumber(String(args.amount))
        .div(ETH_DECIMALS)
        .toFixed(2)} ETH`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event:
      "event WithdrawalsReceived(address vault, address token, uint256 amount)",
    alertId: "LIDO-DAO-RECOVER-TO-VAULT",
    name: "ℹ Lido DAO: Funds recovered to vault",
    description: (args: any) =>
      `Funds recovered to vault:\n` +
      `Vault: ${args.vault}\n` +
      `Token: ${args.token}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_DAO_ADDRESS,
    event: "event ContractVersionSet(uint256 version)",
    alertId: "LIDO-DAO-CONTRACT-VERSION-SET",
    name: "ℹ Lido DAO: Contract version set",
    description: (args: any) =>
      `Contract version set:\n` + `Version: ${args.version}`,
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

export const BURNER_EVENTS_OF_NOTICE = [
  {
    address: LIDO_BURNER_ADDRESS,
    event:
      "event ERC20Recovered(address indexed requestedBy, address indexed token,uint256 amount)",
    alertId: "LIDO-BURNER-ERC20-RECOVERED",
    name: "ℹ Lido Burner: ERC20 recovered",
    description: (args: any) =>
      `ERC20 recovered:\n` +
      `Requested by: ${args.requestedBy}\n` +
      `Token: ${args.token}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_BURNER_ADDRESS,
    event:
      "event ERC721Recovered(address indexed requestedBy, address indexed token, uint256 tokenId)",
    alertId: "LIDO-BURNE-ERC721-RECOVERED",
    name: "ℹ Lido Burner: ERC721 recovered",
    description: (args: any) =>
      `ERC721 recovered:\n` +
      `Requested by: ${args.requestedBy}\n` +
      `Token: ${args.token}\n` +
      `Token ID: ${args.tokenId}`,
    severity: FindingSeverity.Info,
  },
];

export const DEPOSIT_SECURITY_EVENTS_OF_NOTICE = [
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event:
      "event DepositsPaused(address indexed guardian, uint24 indexed stakingModuleId)",
    alertId: "LIDO-DEPOSITS-PAUSED",
    name: "🚨 Deposit Security: Deposits paused",
    description: (args: any) =>
      `Deposits were paused by ${args.guardian} for ${args.stakingModuleId} staking module`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event DepositsUnpaused(uint24 indexed stakingModuleId)",
    alertId: "LIDO-DEPOSITS-UNPAUSED",
    name: "✅ Deposit Security: Deposits resumed",
    description: (args: any) =>
      `Deposits were resumed for ${args.stakingModuleId} staking module`,
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
    description: (args: any) => `New quorum size ${args.newValue}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event MaxDepositsChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MAX-DEPOSITS-CHANGED",
    name: "⚠️ Deposit Security: Max deposits changed",
    description: (args: any) => `New value ${args.newValue}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_DEPOSIT_SECURITY_ADDRESS,
    event: "event MinDepositBlockDistanceChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MIN-DEPOSITS-BLOCK-DISTANCE-CHANGED",
    name: "⚠️ Deposit Security: Min deposit block distance changed",
    description: (args: any) => `New value ${args.newValue}`,
    severity: FindingSeverity.High,
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

export const MEV_ALLOWED_LIST_EVENTS_OF_NOTICE = [
  {
    address: MEV_ALLOWED_LIST_ADDRESS,
    event:
      "event RelayAdded (string indexed uri_hash, (string uri, string operator, bool is_mandatory, string description) relay)",
    alertId: "MEV-RELAY-ADDED",
    name: "ℹ️ MEV Allowed list: Relay added",
    description: (args: any) =>
      `New MEV relay added.\n` +
      `URI: ${args[1].uri}\n` +
      `Operator: ${args[1].operator}\n` +
      `Mandatory: ${args[1].is_mandatory}\n` +
      `Description: ${args[1].description}`,
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
    event:
      "event ERC20Recovered (address indexed token, uint256 amount, address indexed recipient)",
    alertId: "MEV-ERC20-RECOVERED",
    name: "⚠️ MEV Allowed list: ERC20 Recovered",
    description: (args: any) =>
      `ERC20 tokens were recovered from MEV allowed list contract.\n` +
      `Token: ${args.token}\n` +
      `Amount: ${new BigNumber(String(args.amount)).toFixed(0)}\n` +
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

export const TRP_EVENTS_OF_NOTICE = [
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event VotingAdapterUpgraded(address voting_adapter)",
    alertId: "TRP-VOTING-ADAPTER-UPGRADED",
    name: "🚨 TRP Factory: Voting adapter upgraded",
    description: (args: any) =>
      `Voting adapter was upgraded to ${args.voting_adapter}`,
    severity: FindingSeverity.High,
  },
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event OwnerChanged(address owner)",
    alertId: "TRP-OWNER-CHANGED",
    name: "🚨 TRP Factory: Owner changed",
    description: (args: any) =>
      `Owner of the TRP factory and all vestings was changed to ${args.owner}`,
    severity: FindingSeverity.High,
  },
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event ManagerChanged(address manager)",
    alertId: "TRP-MANAGER-CHANGED",
    name: "🚨 TRP Factory: Manager changed",
    description: (args: any) =>
      `Manager of the TRP factory and all vestings was changed to ${args.manager}`,
    severity: FindingSeverity.High,
  },
];
