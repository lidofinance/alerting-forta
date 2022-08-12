import BigNumber from "bignumber.js";
import { FindingSeverity, FindingType } from "forta-agent";

import proxyShortABI from "./abi/ProxyShortABI.json";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

export const ROLES = new Map<string, string>([
  [
    "0x63f736f21cb2943826cd50b191eb054ebbea670e4e962d0527611f830cd399d6",
    "DEPOSITS_DISABLER_ROLE",
  ],
  [
    "0x4b43b36766bde12c5e9cbbc37d15f8d1f769f08f54720ab370faeb4ce893753a",
    "DEPOSITS_ENABLER_ROLE",
  ],
  [
    "0x94a954c0bc99227eddbc0715a62a7e1056ed8784cd719c2303b685683908857c",
    "WITHDRAWALS_DISABLER_ROLE",
  ],
  [
    "0x9ab8816a3dc0b3849ec1ac00483f6ec815b07eee2fd766a353311c823ad59d0d",
    "WITHDRAWALS_ENABLER_ROLE",
  ],
  [
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "DEFAULT_ADMIN_ROLE",
  ],
]);

// 48 hours
export const MAX_WITHDRAWALS_WINDOW = 60 * 60 * 24 * 2;
// 10k wstETH
export const MAX_WITHDRAWALS_SUM = 10000;


// ADDRESSES AND EVENTS

export const GOV_BRIDGE_ADDRESS = "0x1dca41859cd23b526cbe74da8f48ac96e14b1a29";
export const L2_ERC20_TOKEN_GATEWAY =
  "0x07d4692291b9e30e326fd31706f686f83f331b82";

export const WITHDRAWAL_INITIATED_EVENT = "event WithdrawalInitiated(address l1Token, address indexed from, address indexed to, uint256 indexed l2ToL1Id, uint256 exitNum, uint256 amount)"

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
    name: "Arbitrum Gov Bridge: Ethereum Governance Executor Updated",
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
    name: "Arbitrum Gov Bridge: Guardian Updated",
    description: (args: any) =>
      `Ethereum Governance Guardian was updated from ` +
      `${args.oldGuardian} to ${args.newGuardian}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: "event DelayUpdate(uint256 oldDelay, uint256 newDelay)",
    alertId: "GOV-BRIDGE-DELAY-UPDATED",
    name: "Arbitrum Gov Bridge: Delay Updated",
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
    name: "Arbitrum Gov Bridge: Grace Period Updated",
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
    name: "Arbitrum Gov Bridge: Min Delay Updated",
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
    name: "Arbitrum Gov Bridge: Max Delay Updated",
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
    name: "Arbitrum Gov Bridge: Action set queued",
    description: (args: any) => `Action set ${args.id} was queued`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)",
    alertId: "GOV-BRIDGE-ACTION-SET-EXECUTED",
    name: "Arbitrum Gov Bridge: Action set executed",
    description: (args: any) => `Action set ${args.id} was executed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: "event ActionsSetCanceled(uint256 indexed id)",
    alertId: "GOV-BRIDGE-ACTION-SET-CANCELED",
    name: "Arbitrum Gov Bridge: Action set canceled",
    description: (args: any) => `Action set ${args.id} was canceled`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
];

export interface LidoProxy {
  name: string;
  address: string;
  shortABI: string;
  functions: Map<string, string>;
}

export const LIDO_PROXY_CONTRACTS: LidoProxy[] = [
  {
    name: "WstETH ERC20Bridged",
    address: "0x5979d7b546e38e414f7e9822514be443a4800529",
    shortABI: JSON.stringify(proxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
  },
  {
    name: "L2ERC20TokenGateway",
    address: L2_ERC20_TOKEN_GATEWAY,
    shortABI: JSON.stringify(proxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
  },
];

export const PROXY_ADMIN_EVENTS: EventOfNotice[] = LIDO_PROXY_CONTRACTS.map(
  (proxyInfo: LidoProxy) => {
    const eventsDesc: EventOfNotice[] = [
      {
        address: proxyInfo.address,
        event: "event ProxyOssified()",
        alertId: "PROXY-OSSIFIED",
        name: "Arbitrum: Proxy ossified",
        description: (args: any) =>
          `Proxy for ${proxyInfo.name}(${proxyInfo.address}) was ossified` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: proxyInfo.address,
        event: "event AdminChanged(address previousAdmin, address newAdmin)",
        alertId: "PROXY-ADMIN-CHANGED",
        name: "Arbitrum: Proxy admin changed",
        description: (args: any) =>
          `Proxy admin for ${proxyInfo.name}(${proxyInfo.address}) ` +
          `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
          `\n(detected by event)`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
      {
        address: proxyInfo.address,
        event: "event Upgraded(address indexed implementation)",
        alertId: "PROXY-UPGRADED",
        name: "Arbitrum: Proxy upgraded",
        description: (args: any) =>
          `Proxy for ${proxyInfo.name}(${proxyInfo.address}) ` +
          `was updated to ${args.implementation}` +
          `\n(detected by event)`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
      {
        address: proxyInfo.address,
        event: "event BeaconUpgraded(address indexed beacon)",
        alertId: "PROXY-BEACON-UPGRADED",
        name: "Arbitrum: Proxy beacon upgraded",
        description: (args: any) =>
          `Proxy for ${proxyInfo.name}(${proxyInfo.address}) ` +
          `beacon was updated to ${args.beacon}` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
    ];
    return eventsDesc;
  }
).reduce((a, b) => [...a, ...b]);

export const L2_BRIDGE_EVENTS: EventOfNotice[] = [
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event:
      "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
    alertId: "L2-BRIDGE-ROLE-ADMIN-CHANGED",
    name: "Arbitrum L2 Bridge: Role Admin changed",
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
    name: "Arbitrum L2 Bridge: Role granted",
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
    name: "Arbitrum L2 Bridge: Role revoked",
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
    name: "Arbitrum L2 Bridge: Deposits Enabled",
    description: (args: any) => `Deposits were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event DepositsDisabled(address indexed disabler)",
    alertId: "L2-BRIDGE-DEPOSITS-DISABLED",
    name: "Arbitrum L2 Bridge: Deposits Disabled",
    description: (args: any) => `Deposits were disabled by ${args.disabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event WithdrawalsEnabled(address indexed enabler)",
    alertId: "L2-BRIDGE-WITHDRAWALS-ENABLED",
    name: "Arbitrum L2 Bridge: Withdrawals Enabled",
    description: (args: any) => `Withdrawals were enabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event WithdrawalsDisabled(address indexed disabler)",
    alertId: "L2-BRIDGE-WITHDRAWALS-DISABLED",
    name: "Arbitrum L2 Bridge: Withdrawals Disabled",
    description: (args: any) => `Withdrawals were disabled by ${args.enabler}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: L2_ERC20_TOKEN_GATEWAY,
    event: "event Initialized(address indexed admin)",
    alertId: "L2-BRIDGE-IMPLEMENTATION-INITIALIZED",
    name: "Arbitrum L2 Bridge: Implementation initialized",
    description: (args: any) =>
      `Implementation of the Arbitrum L2 Bridge was initialized by ${args.admin}\n` +
      `NOTE: This is not the thing that should be left unacted! ` +
      `Make sure that this call was made by Lido!`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
];
