import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { ETH_DECIMALS } from "../../common/constants";
import { etherscanAddress } from "../../common/utils";
import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  NODE_OPERATORS_REGISTRY_ADDRESS as norAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
  DEPOSIT_SECURITY_ADDRESS as dsAddress,
  DEPOSIT_EXECUTOR_ADDRESS as deAddress,
  MEV_ALLOWED_LIST_ADDRESS as mevAllowlistAddress,
  INSURANCE_FUND_ADDRESS as insuranceAddress,
  BURNER_ADDRESS as burnerAddress,
  TRP_FACTORY_ADDRESS as trpFactoryAddress,
  ENS_BASE_REGISTRAR_ADDRESS as ensRegistrarAddress,
  LDO_ADDRESS as ldoAddress,
  WSTETH_ADDRESS as wstethAddress,
  DAI_ADDRESS as daiAddress,
  USDT_ADDRESS as usdtAddress,
  USDC_ADDRESS as usdcAddress,
} from "../../common/constants";

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
// 5 minutes
export const BLOCK_CHECK_INTERVAL = 25;

export const LIDO_STETH_ADDRESS = lidoStethAddress;
export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const DEPOSIT_SECURITY_ADDRESS = dsAddress;
export const DEPOSIT_EXECUTOR_ADDRESS = deAddress;
export const MEV_ALLOWED_LIST_ADDRESS = mevAllowlistAddress;
export const INSURANCE_FUND_ADDRESS = insuranceAddress;
export const BURNER_ADDRESS = burnerAddress;
export const TRP_FACTORY_ADDRESS = trpFactoryAddress;
export const ENS_BASE_REGISTRAR_ADDRESS = ensRegistrarAddress;
export const NODE_OPERATORS_REGISTRY_ADDRESS = norAddress;

export const KNOWN_ERC20 = new Map<string, ERC20>([
  [lidoStethAddress, { decimals: 18, name: "stETH" }],
  [wstethAddress, { decimals: 18, name: "wstETH" }],
  [ldoAddress, { decimals: 18, name: "LDO" }],
  [daiAddress, { decimals: 18, name: "DAI" }],
  [usdtAddress, { decimals: 6, name: "USDT" }],
  [usdcAddress, { decimals: 6, name: "USDC" }],
]);

export const MIN_AVAILABLE_KEYS_COUNT = 1000;

// 2 ETH
export const MIN_DEPOSIT_EXECUTOR_BALANCE = 2;

// 10000 ETH
export const MAX_DEPOSITABLE_ETH_AMOUNT_MEDIUM = 10000;

// 20000 ETH
export const MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL = 20000;

// 1 hour
export const MAX_DEPOSITABLE_ETH_AMOUNT_CRITICAL_TIME = 60 * 60;

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

export const LIDO_EVENTS_OF_NOTICE = [
  {
    address: LIDO_STETH_ADDRESS,
    event: "event Stopped()",
    alertId: "LIDO-STOPPED",
    name: "🚨🚨🚨 Lido: Stopped 🚨🚨🚨",
    description: (args: any) => `Lido DAO contract was stopped`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event: "event Resumed()",
    alertId: "LIDO-RESUMED",
    name: "✅ Lido: Resumed",
    description: (args: any) => `Lido DAO contract was resumed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event: "event StakingPaused()",
    alertId: "LIDO-STAKING-PAUSED",
    name: "🚨 Lido: Staking paused",
    description: (args: any) => `Staking was paused!`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event: "event StakingResumed()",
    alertId: "LIDO-STAKING-RESUMED",
    name: "✅ Lido: Staking resumed",
    description: (args: any) => `Staking was resumed!`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event:
      "event StakingLimitSet(uint256 maxStakeLimit, uint256 stakeLimitIncreasePerBlock)",
    alertId: "LIDO-STAKING-LIMIT-SET",
    name: "⚠️ Lido: Staking limit set",
    description: (args: any) =>
      `Staking limit was set with:\n` +
      `Max staking limit: ${args.maxStakeLimit}\n` +
      `Stake limit increase per block: ${args.stakeLimitIncreasePerBlock}`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event: "event StakingLimitRemoved()",
    alertId: "LIDO-STAKING-LIMIT-REMOVED",
    name: "🚨 Lido: Staking limit removed",
    description: (args: any) => `Staking limit was removed`,
    severity: FindingSeverity.High,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event: "event LidoLocatorSet(address lidoLocator)",
    alertId: "LIDO-LOCATOR-SET",
    name: "🚨 Lido: Locator set",
    description: (args: any) =>
      `Lido locator was set to: ${etherscanAddress(args.lidoLocator)}`,
    severity: FindingSeverity.Critical,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event: "event RecoverToVault(address vault, address token, uint256 amount)",
    alertId: "LIDO-RECOVER-TO-VAULT",
    name: "ℹ️ Lido: Funds recovered to vault",
    description: (args: any) =>
      `Funds recovered to vault:\n` +
      `Vault: ${etherscanAddress(args.vault)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: LIDO_STETH_ADDRESS,
    event: "event ContractVersionSet(uint256 version)",
    alertId: "LIDO-CONTRACT-VERSION-SET",
    name: "ℹ️ Lido: Contract version set",
    description: (args: any) =>
      `Contract version set:\n` + `Version: ${args.version}`,
    severity: FindingSeverity.Info,
  },
];

export const BURNER_EVENTS_OF_NOTICE = [
  {
    address: BURNER_ADDRESS,
    event:
      "event ERC20Recovered(address indexed requestedBy, address indexed token,uint256 amount)",
    alertId: "LIDO-BURNER-ERC20-RECOVERED",
    name: "ℹ️ Lido Burner: ERC20 recovered",
    description: (args: any) =>
      `ERC20 recovered:\n` +
      `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${args.amount}`,
    severity: FindingSeverity.Info,
  },
  {
    address: BURNER_ADDRESS,
    event:
      "event ERC721Recovered(address indexed requestedBy, address indexed token, uint256 tokenId)",
    alertId: "LIDO-BURNE-ERC721-RECOVERED",
    name: "ℹ️ Lido Burner: ERC721 recovered",
    description: (args: any) =>
      `ERC721 recovered:\n` +
      `Requested by: ${etherscanAddress(args.requestedBy)}\n` +
      `Token: ${etherscanAddress(args.token)}\n` +
      `Token ID: ${args.tokenId}`,
    severity: FindingSeverity.Info,
  },
];

export const DEPOSIT_SECURITY_EVENTS_OF_NOTICE = [
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event:
      "event DepositsPaused(address indexed guardian, uint24 indexed stakingModuleId)",
    alertId: "LIDO-DEPOSITS-PAUSED",
    name: "🚨 Deposit Security: Deposits paused",
    description: (args: any) =>
      `Deposits were paused by ${etherscanAddress(args.guardian)} for ${
        args.stakingModuleId
      } staking module`,
    severity: FindingSeverity.Critical,
  },
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event: "event DepositsUnpaused(uint24 indexed stakingModuleId)",
    alertId: "LIDO-DEPOSITS-UNPAUSED",
    name: "✅ Deposit Security: Deposits resumed",
    description: (args: any) =>
      `Deposits were resumed for ${args.stakingModuleId} staking module`,
    severity: FindingSeverity.High,
  },
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianAdded(address guardian)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-ADDED",
    name: "⚠️ Deposit Security: Guardian added",
    description: (args: any) =>
      `New guardian added ${etherscanAddress(args.guardian)}`,
    severity: FindingSeverity.High,
  },
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianRemoved(address guardian)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-REMOVED",
    name: "⚠️ Deposit Security: Guardian removed",
    description: (args: any) =>
      `Guardian ${etherscanAddress(args.guardian)} was removed`,
    severity: FindingSeverity.High,
  },
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event: "event GuardianQuorumChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-GUARDIAN-QUORUM-CHANGED",
    name: "🚨 Deposit Security: Guardian quorum changed",
    description: (args: any) => `New quorum size ${args.newValue}`,
    severity: FindingSeverity.High,
  },
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event: "event MaxDepositsChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MAX-DEPOSITS-CHANGED",
    name: "⚠️ Deposit Security: Max deposits changed",
    description: (args: any) => `New value ${args.newValue}`,
    severity: FindingSeverity.High,
  },
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event: "event MinDepositBlockDistanceChanged(uint256 newValue)",
    alertId: "LIDO-DEPOSITOR-MIN-DEPOSITS-BLOCK-DISTANCE-CHANGED",
    name: "⚠️ Deposit Security: Min deposit block distance changed",
    description: (args: any) => `New value ${args.newValue}`,
    severity: FindingSeverity.High,
  },
  {
    address: DEPOSIT_SECURITY_ADDRESS,
    event: "event OwnerChanged(address newValue)",
    alertId: "LIDO-DEPOSITOR-OWNER-CHANGED",
    name: "🚨 Deposit Security: Owner changed",
    description: (args: any) => `New owner ${etherscanAddress(args.newValue)}`,
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
      `Token: ${etherscanAddress(args.token)}\n` +
      `Amount: ${new BigNumber(String(args.amount)).toFixed(0)}\n` +
      `Recipient: ${etherscanAddress(args.recipient)}`,
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
    address: INSURANCE_FUND_ADDRESS,
    event:
      "event EtherTransferred(address indexed _recipient, uint256 _amount)",
    alertId: "INS-FUND-ETH-TRANSFERRED",
    name: "⚠️ Insurance fund: ETH transferred",
    description: (args: any) =>
      `${new BigNumber(String(args._amount))
        .div(ETH_DECIMALS)
        .toFixed(
          2
        )} ETH were transferred from insurance fund to ${etherscanAddress(
        args._recipient
      )}`,
    severity: FindingSeverity.Info,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
    event:
      "event ERC721Transferred(address indexed _token, address indexed _recipient, uint256 _tokenId, bytes _data)",
    alertId: "INS-FUND-ERC721-TRANSFERRED",
    name: "⚠️ Insurance fund: ERC721 transferred",
    description: (args: any) =>
      `ERC721 token (address: ${etherscanAddress(args._token)}, id: ${
        args._tokenId
      }) was transferred form insurance fund to ${etherscanAddress(
        args._recipient
      )}`,
    severity: FindingSeverity.Info,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
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
        .toFixed(2)} of ${etherscanAddress(args._token)}(${
        tokenInfo.name
      }) were transferred from insurance fund to ${etherscanAddress(
        args._recipient
      )}`;
    },
    severity: FindingSeverity.High,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
    event:
      "event ERC1155Transferred(address indexed _token, address indexed _recipient, uint256 _tokenId, uint256 _amount, bytes _data)",
    alertId: "INS-FUND-ERC1155-TRANSFERRED",
    name: "⚠️ Insurance fund: ERC1155 transferred",
    description: (args: any) =>
      `${args._amount} of ERC1155 token (address: ${etherscanAddress(
        args._token
      )}, id: ${
        args._tokenId
      }) was transferred form insurance fund to ${etherscanAddress(
        args._recipient
      )}`,
    severity: FindingSeverity.Info,
  },
  {
    address: INSURANCE_FUND_ADDRESS,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "INS-FUND-OWNERSHIP-TRANSFERRED",
    name: "🚨 Insurance fund: Ownership transferred",
    description: (args: any) =>
      `Owner of the insurance fund was transferred from ${etherscanAddress(
        args.previousOwner
      )} to ${etherscanAddress(args.newOwner)}`,
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
      `Voting adapter was upgraded to ${etherscanAddress(args.voting_adapter)}`,
    severity: FindingSeverity.High,
  },
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event OwnerChanged(address owner)",
    alertId: "TRP-OWNER-CHANGED",
    name: "🚨 TRP Factory: Owner changed",
    description: (args: any) =>
      `Owner of the TRP factory and all vestings was changed to ${etherscanAddress(
        args.owner
      )}`,
    severity: FindingSeverity.High,
  },
  {
    address: TRP_FACTORY_ADDRESS,
    event: "event ManagerChanged(address manager)",
    alertId: "TRP-MANAGER-CHANGED",
    name: "🚨 TRP Factory: Manager changed",
    description: (args: any) =>
      `Manager of the TRP factory and all vestings was changed to ${etherscanAddress(
        args.manager
      )}`,
    severity: FindingSeverity.High,
  },
];
