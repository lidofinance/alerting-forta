import BigNumber from "bignumber.js";
import { FindingSeverity, FindingType } from "forta-agent";

import proxyShortABI from "./abi/ProxyShortABI.json";

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

// ADDRESSES AND EVENTS

export const WSTETH_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";

export const ARBITRUM_L1_GATEWAY_ROUTER =
  "0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef";

export const GATEWAY_SET_EVENT =
  "event GatewaySet(address indexed l1Token, address indexed gateway)";

export const L1_ERC20_TOKEN_GATEWAYS = [
  {
    name: "Arbitrum",
    address: "0x0f25c1dc2a9922304f2eac71dca9b07e310e8e5a",
  },
  {
    name: "Optimism",
    address: "0x76943c0d61395d8f2edf9060e1533529cae05de6",
  },
];

type EventOfNotice = {
  address: string;
  event: string;
  alertId: string;
  name: string;
  description: CallableFunction;
  severity: FindingSeverity;
  type: FindingType;
};

export interface LidoProxy {
  name: string;
  address: string;
  shortABI: string;
  functions: Map<string, string>;
}

export const LIDO_PROXY_CONTRACTS: LidoProxy[] = [
  {
    name: "L1ERC20TokenGateway to Arbitrum",
    address: "0x0f25c1dc2a9922304f2eac71dca9b07e310e8e5a",
    shortABI: JSON.stringify(proxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
  },
  {
    name: "L1ERC20TokenGateway to Optimism",
    address: "0x76943c0d61395d8f2edf9060e1533529cae05de6",
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
        name: `🚨 ${proxyInfo.name}: Proxy ossified`,
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
        name: `🚨 ${proxyInfo.name}: Proxy admin changed`,
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
        name: `🚨 ${proxyInfo.name}: Proxy upgraded`,
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
        name: `🚨 ${proxyInfo.name}: Proxy beacon upgraded`,
        description: (args: any) =>
          `Proxy for ${proxyInfo.name}(${proxyInfo.address}) ` +
          `beacon was updated to ${args.beacon}` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
    ];
    return eventsDesc;
  },
).reduce((a, b) => [...a, ...b]);

export const THIRD_PARTY_PROXY_EVENTS = [
  {
    address: "0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef", // Arbitrum One: L1 Gateway Router
    event: "event AdminChanged(address previousAdmin, address newAdmin)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Arbitrum Native Bridge: L1 Gateway Router proxy admin changed",
    description: (args: any) =>
      `Proxy admin for Arbitrum One: L1 Gateway Router ` +
      `was changed\nfrom: ${args.previousAdmin}\nto: ${args.newAdmin}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: "0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef", // Arbitrum One: L1 Gateway Router
    event: "event Upgraded(address indexed implementation)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Arbitrum Native Bridge: L1 Gateway Router proxy upgraded",
    description: (args: any) =>
      `Proxy for Arbitrum One: L1 Gateway Router ` +
      `was upgraded to ${args.implementation}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: "0x25ace71c97b33cc4729cf772ae268934f7ab5fa1", // Optimism: Proxy OVM L1 Cross Domain Messenger
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Optimism Native Bridge: OVM L1 Cross Domain Messenger proxy admin changed",
    description: (args: any) =>
      `Proxy admin for Optimism: OVM L1 Cross Domain Messenger ` +
      `was changed\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: "0x25ace71c97b33cc4729cf772ae268934f7ab5fa1", // Optimism: Proxy OVM L1 Cross Domain Messenger
    event:
      "event AddressSet(string indexed _name, address _newAddress,address _oldAddress)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Optimism Native Bridge: OVM L1 Cross Domain Messenger proxy upgraded",
    description: (args: any) =>
      `Proxy for Optimism: Proxy OVM L1 Cross Domain Messenger ` +
      `was upgraded form: ${args._oldAddress} to: ${args._newAddress}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
];

export const L1_BRIDGE_EVENTS: EventOfNotice[] = L1_ERC20_TOKEN_GATEWAYS.map(
  (gw) => {
    return [
      {
        address: gw.address,
        event:
          "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
        alertId: "L1-BRIDGE-ROLE-ADMIN-CHANGED",
        name: `⚠️ ${gw.name} L1 Bridge: Role Admin changed`,
        description: (args: any) =>
          `Role Admin for role ${args.role}(${
            ROLES.get(args.role) || "unknown"
          }) ` +
          `was changed from ${args.previousAdminRole} to ${args.newAdminRole}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event:
          "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
        alertId: "L1-BRIDGE-ROLE-GRANTED",
        name: `⚠️ ${gw.name} L1 Bridge: Role granted`,
        description: (args: any) =>
          `Role ${args.role}(${ROLES.get(args.role) || "unknown"}) ` +
          `was granted to ${args.account} by ${args.sender}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event:
          "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
        alertId: "L1-BRIDGE-ROLE-REVOKED",
        name: `⚠️ ${gw.name} L1 Bridge: Role revoked`,
        description: (args: any) =>
          `Role ${args.role}(${ROLES.get(args.role) || "unknown"}) ` +
          `was revoked to ${args.account} by ${args.sender}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event DepositsEnabled(address indexed enabler)",
        alertId: "L1-BRIDGE-DEPOSITS-ENABLED",
        name: `✅ ${gw.name} L1 Bridge: Deposits Enabled`,
        description: (args: any) => `Deposits were enabled by ${args.enabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event DepositsDisabled(address indexed disabler)",
        alertId: "L1-BRIDGE-DEPOSITS-DISABLED",
        name: `❌ ${gw.name} L1 Bridge: Deposits Disabled`,
        description: (args: any) =>
          `Deposits were disabled by ${args.disabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event WithdrawalsEnabled(address indexed enabler)",
        alertId: "L1-BRIDGE-WITHDRAWALS-ENABLED",
        name: `✅ ${gw.name} L1 Bridge: Withdrawals Enabled`,
        description: (args: any) =>
          `Withdrawals were enabled by ${args.enabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event WithdrawalsDisabled(address indexed disabler)",
        alertId: "L1-BRIDGE-WITHDRAWALS-DISABLED",
        name: `❌ ${gw.name} L1 Bridge: Withdrawals Disabled`,
        description: (args: any) =>
          `Withdrawals were disabled by ${args.enabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event Initialized(address indexed admin)",
        alertId: "L1-BRIDGE-IMPLEMENTATION-INITIALIZED",
        name: `🚨 ${gw.name} L1 Bridge: Implementation initialized`,
        description: (args: any) =>
          `Implementation of the ${gw.name} L1 Bridge was initialized by ${args.admin}\n` +
          `NOTE: This is not the thing that should be left unacted! ` +
          `Make sure that this call was made by Lido!`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
    ];
  },
).reduce((a, b) => [...a, ...b]);
