import BigNumber from "bignumber.js";
import { FindingSeverity, FindingType } from "forta-agent";

import proxyAdmin from "./abi/ProxyAdmin.json";
import ossifiableProxy from "./abi/OssifiableProxy.json";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export const ROLES = new Map<string, string>([
  [
    "0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6",
    "DEPOSITS DISABLER ROLE",
  ],
  [
    "0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a",
    "DEPOSITS ENABLER ROLE",
  ],
  [
    "0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c",
    "WITHDRAWALS DISABLER ROLE",
  ],
  [
    "0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d",
    "WITHDRAWALS ENABLER ROLE",
  ],
  [
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "DEFAULT ADMIN ROLE",
  ],
]);

// 48 hours
export const MAX_WITHDRAWALS_WINDOW = 60 * 60 * 24 * 2;
// 10k wstETH
export const MAX_WITHDRAWALS_SUM = 10000;

// ADDRESSES AND EVENTS

export const GOV_BRIDGE_ADDRESS = "0x139EE25DCad405d2a038E7A67f9ffdbf0f573f3c";
export const L2_ERC20_TOKEN_GATEWAY =
  "0xE1D6A50E7101c8f8db77352897Ee3f1AC53f782B";

// ProxyAdmin for ZkSyncBridgeExecutor and ERC20BridgedUpgradeable
export const PROXY_ADMIN = "0xbd80e505ecc49bae2cc86094a78fa0e2db28b52a";
export const ERC20_BRIDGED_UPGRADEABLE =
  "0x703b52F2b28fEbcB60E1372858AF5b18849FE867";
export const ZKSYNC_BRIDGE_EXECUTOR =
  "0x139EE25DCad405d2a038E7A67f9ffdbf0f573f3c";

export const L2_ERC20_BRIDGE = "0xE1D6A50E7101c8f8db77352897Ee3f1AC53f782B";

export const WITHDRAWAL_INITIATED_EVENT =
  "event WithdrawalInitiated(address indexed l2Sender, address indexed l1Receiver, address indexed l2Token, uint256 amount)";

type EventOfNotice = {
  address: string;
  event: string;
  alertId: string;
  name: string;
  description: CallableFunction;
  severity: FindingSeverity;
  type: FindingType;
};

export const GOV_BRIDGE_EVENTS: EventOfNotice[] = [
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event EthereumGovernanceExecutorUpdate(address oldEthereumGovernanceExecutor, address newEthereumGovernanceExecutor)",
    alertId: "GOV-BRIDGE-EXEC-UPDATED",
    name: "🚨 ZkSync Gov Bridge: Ethereum Governance Executor Updated",
    description: (args: any) =>
      `Ethereum Governance Executor was updated from ` +
      `${args.oldEthereumGovernanceExecutor} to ${args.newEthereumGovernanceExecutor}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: "event GuardianUpdate(address oldGuardian, address newGuardian)",
    alertId: "GOV-BRIDGE-GUARDIAN-UPDATED",
    name: "🚨 ZkSync Gov Bridge: Guardian Updated",
    description: (args: any) =>
      `Guardian was updated from ` +
      `${args.oldGuardian} to ${args.newGuardian}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: "event DelayUpdate(uint256 oldDelay, uint256 newDelay)",
    alertId: "GOV-BRIDGE-DELAY-UPDATED",
    name: "⚠️ ZkSync Gov Bridge: Delay Updated",
    description: (args: any) =>
      `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)",
    alertId: "GOV-BRIDGE-GRACE-PERIOD-UPDATED",
    name: "⚠️ ZkSync Gov Bridge: Grace Period Updated",
    description: (args: any) =>
      `Grace Period was updated from ` +
      `${args.oldGracePeriod} to ${args.newGracePeriod}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)",
    alertId: "GOV-BRIDGE-MIN-DELAY-UPDATED",
    name: "⚠️ ZkSync Gov Bridge: Min Delay Updated",
    description: (args: any) =>
      `Min Delay was updated from ` +
      `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)",
    alertId: "GOV-BRIDGE-MAX-DELAY-UPDATED",
    name: "⚠️ ZkSync Gov Bridge: Max Delay Updated",
    description: (args: any) =>
      `Max Delay was updated from ` +
      `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)",
    alertId: "GOV-BRIDGE-ACTION-SET-QUEUED",
    name: "ℹ ZkSync Gov Bridge: Action set queued",
    description: (args: any) => `Action set ${args.id} was queued`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)",
    alertId: "GOV-BRIDGE-ACTION-SET-EXECUTED",
    name: "ℹ ZkSync Gov Bridge: Action set executed",
    description: (args: any) => `Action set ${args.id} was executed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: "event ActionsSetCanceled(uint256 indexed id)",
    alertId: "GOV-BRIDGE-ACTION-SET-CANCELED",
    name: "ℹ ZkSync Gov Bridge: Action set canceled",
    description: (args: any) => `Action set ${args.id} was canceled`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
];

export interface LidoZkSyncProxy {
  name: string;
  proxyAdminAddress: string;
  shortABI: string;
  proxyAddress: string;
  functions: Map<string, string>;
}

export interface LidoProxy {
  name: string;
  address: string;
  shortABI: string;
  functions: Map<string, string>;
}

export const LIDO_TRANSPARENT_PROXY_CONTRACTS: LidoZkSyncProxy[] = [
  {
    name: "ERC20BridgedUpgradeable",
    proxyAdminAddress: PROXY_ADMIN,
    proxyAddress: ERC20_BRIDGED_UPGRADEABLE,
    shortABI: JSON.stringify(proxyAdmin),
    functions: new Map<string, string>([
      ["admin", "getProxyAdmin"],
      ["implementation", "getProxyImplementation"],
      ["owner", "owner"],
    ]),
  },
  {
    name: "ZkSyncBridgeExecutor",
    proxyAdminAddress: PROXY_ADMIN,
    proxyAddress: ZKSYNC_BRIDGE_EXECUTOR,
    shortABI: JSON.stringify(proxyAdmin),
    functions: new Map<string, string>([
      ["admin", "getProxyAdmin"],
      ["implementation", "getProxyImplementation"],
      ["owner", "owner"],
    ]),
  },
];
export const LIDO_OSSIFIABLE_PROXY_CONTRACTS: LidoProxy[] = [
  {
    name: "L2ERC20Bridge",
    address: L2_ERC20_BRIDGE,
    shortABI: JSON.stringify(ossifiableProxy),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
      ["ossified", "proxy__getIsOssified"],
    ]),
  },
];

export const PROXY_ADMIN_EVENTS: EventOfNotice[] =
  LIDO_TRANSPARENT_PROXY_CONTRACTS.map((proxyInfo: LidoZkSyncProxy) => {
    const eventsDesc: EventOfNotice[] = [
      {
        address: proxyInfo.proxyAddress,
        event: "event AdminChanged(address previousAdmin, address newAdmin)",
        alertId: "PROXY-ADMIN-CHANGED",
        name: "🚨 ZkSync: Proxy admin changed",
        description: (args: any) =>
          `Proxy admin for ${proxyInfo.name}(${proxyInfo.proxyAdminAddress}) ` +
          `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
          `\n(detected by event)`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
      {
        address: proxyInfo.proxyAddress,
        event: "event Upgraded(address indexed implementation)",
        alertId: "PROXY-UPGRADED",
        name: "🚨 ZkSync: Proxy upgraded",
        description: (args: any) =>
          `Proxy for ${proxyInfo.name}(${proxyInfo.proxyAdminAddress}) ` +
          `was updated to ${args.implementation}` +
          `\n(detected by event)`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
      {
        address: proxyInfo.proxyAddress,
        event: "event BeaconUpgraded(address indexed beacon)",
        alertId: "PROXY-BEACON-UPGRADED",
        name: "🚨 ZkSync: Proxy beacon upgraded",
        description: (args: any) =>
          `Proxy for ${proxyInfo.name}(${proxyInfo.proxyAdminAddress}) ` +
          `beacon was updated to ${args.beacon}` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: proxyInfo.proxyAddress,
        event:
          "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
        alertId: "PROXY-OWNER-TRANSFERRED",
        name: "🚨 ZkSync: Proxy owner transferred",
        description: (args: any) =>
          `Proxy owner for ${proxyInfo.name}(${proxyInfo.proxyAdminAddress}) was changed` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
    ];
    return eventsDesc;
  }).reduce((a, b) => [...a, ...b]);

export const L2_BRIDGE_EVENTS: EventOfNotice[] = [
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event:
      "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
    alertId: "L2-BRIDGE-ROLE-ADMIN-CHANGED",
    name: "🚨 ZkSync L2 Bridge: Role Admin changed",
    description: (args: any) =>
      `Role Admin for role ${args.role}(${
        ROLES.get(args.role) || "unknown"
      }) ` +
      `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event:
      "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "L2-BRIDGE-ROLE-GRANTED",
    name: "⚠️ ZkSync L2 Bridge: Role granted",
    description: (args: any) =>
      `Role ${args.role}(${ROLES.get(args.role) || "unknown"}) ` +
      `was granted to ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event:
      "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
    alertId: "L2-BRIDGE-ROLE-REVOKED",
    name: "⚠️ ZkSync L2 Bridge: Role revoked",
    description: (args: any) =>
      `Role ${args.role}(${ROLES.get(args.role) || "unknown"}) ` +
      `was revoked to ${args.account} by ${args.sender}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event DepositsEnabled(address indexed enabler)",
    alertId: "L2-BRIDGE-DEPOSITS-ENABLED",
    name: "✅ ZkSync L2 Bridge: Deposits Enabled",
    description: (args: any) => `Deposits were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event DepositsDisabled(address indexed disabler)",
    alertId: "L2-BRIDGE-DEPOSITS-DISABLED",
    name: "❌ ZkSync L2 Bridge: Deposits Disabled",
    description: (args: any) => `Deposits were disabled by ${args.disabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event WithdrawalsEnabled(address indexed enabler)",
    alertId: "L2-BRIDGE-WITHDRAWALS-ENABLED",
    name: "✅ ZkSync L2 Bridge: Withdrawals Enabled",
    description: (args: any) => `Withdrawals were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event WithdrawalsDisabled(address indexed disabler)",
    alertId: "L2-BRIDGE-WITHDRAWALS-DISABLED",
    name: "❌ ZkSync L2 Bridge: Withdrawals Disabled",
    description: (args: any) => `Withdrawals were disabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event Initialized(address indexed admin)",
    alertId: "L2-BRIDGE-IMPLEMENTATION-INITIALIZED",
    name: "🚨 ZkSync L2 Bridge: Implementation initialized",
    description: (args: any) =>
      `Implementation of the ZkSync L2 Bridge was initialized by ${args.admin}\n` +
      `NOTE: This is not the thing that should be left unacted! ` +
      `Make sure that this call was made by Lido!`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
];
