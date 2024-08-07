import { FindingSeverity, FindingType } from "forta-agent";
import ossifiableProxyShortABI from "./abi/OssifiableProxyShortABI.json";
import proxyAdminABI from "./abi/ProxyAdminABI.json";
import { Result } from "@ethersproject/abi/lib";
import { formatAddress } from "forta-agent/dist/cli/utils";

type EventOfNotice = {
  address: string;
  event: string;
  alertId: string;
  name: string;
  description: CallableFunction;
  severity: FindingSeverity;
  type: FindingType;
  condition?: (args: Result) => boolean;
};

export interface BridgeProxyInfo {
  name: string;
  address: string;
  shortABI: string;
  functions: Map<string, string>;
  proxyAdminAddress: string | null;
}

// https://docs.chain.link/resources/link-token-contracts#ethereum-mainnet
export const LINK_TOKEN_ADDRESS = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
// https://docs.lido.fi/deployed-contracts/#adi-governance-forwarding
export const CROSS_CHAIN_CONTROLLER_PROXY_ADDRESS =
  "0x93559892D3C7F66DE4570132d68b69BD3c369A7C";

export const BRIDGE_ETH_MIN_BALANCE = 0.5;
export const BRIDGE_LINK_MIN_BALANCE = 5;

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
export const STETH_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84";

export const OPTIMISM_L1_CROSS_DOMAIN_MESSENGER =
  "0x25ace71c97b33cc4729cf772ae268934f7ab5fa1";

export const BASE_L1_CROSS_DOMAIN_MESSENGER =
  "0x866E82a600A1414e583f7F13623F1aC5d58b0Afa";

export const ZKSYNC_L1_DIAMOND_PROXY =
  "0x32400084c286cf3e17e7b677ea9583e60a000324";

export const OPTIMISM_L1ERC20_TOKEN_BRIDGE =
  "0x76943c0d61395d8f2edf9060e1533529cae05de6";
export const BASE_L1ERC20_TOKEN_BRIDGE =
  "0x9de443AdC5A411E83F1878Ef24C3F52C61571e72";
export const ZKSYNC_L1ERC20_BRIDGE =
  "0x41527B2d03844dB6b0945f25702cB958b6d55989";
export const ZKSYNC_L1EXECUTOR = "0xFf7F4d05e3247374e86A3f7231A2Ed1CA63647F2";

// proof of address https://github.com/mantlenetworkio/networks/blob/main/mainnet/addresses.json
export const MANTLE_L1_CROSS_DOMAIN_MESSENGER =
  "0x676A795fe6E43C17c668de16730c3F690FEB7120";
// proof of address https://docs.lido.fi/deployed-contracts/#mantle
export const MANTLE_L1ERC20_TOKEN_BRIDGE =
  "0x2D001d79E5aF5F65a939781FE228B267a8Ed468B";

// proof of address https://docs.linea.build/use-mainnet/info-contracts
export const LINEA_L1_CROSS_DOMAIN_MESSENGER =
  "0xd19d4B5d358258f05D7B411E21A1460D11B0876F";

export const LINEA_L1_TOKEN_BRIDGE =
  "0x051f1d88f0af5763fb888ec4378b4d8b29ea3319";

export const ADMIN_OF_LINEA_L1_TOKEN_BRIDGE =
  "0xf5058616517c068c7b8c7ebc69ff636ade9066d6";

export const SCROLL_L1_TOKEN_BRIDGE =
  "0x6625c6332c9f91f2d27c304e729b86db87a3f504";

export const ADMIN_OF_SCROLL_L1_TOKEN_BRIDGE =
  "0xCC2C53556Bc75217cf698721b29071d6f12628A9";

export const SCROLL_L1_MESSENGER = "0x6774Bcbd5ceCeF1336b5300fb5186a12DDD8b367";

export const SCROLL_L1_GATEWAY_ROUTER =
  "0xF8B1378579659D8F7EE5f3C929c2f3E332E41Fd6";

export const ARBITRUM_GATEWAY_SET_EVENT =
  "event GatewaySet(address indexed l1Token, address indexed gateway)";

export const LINEA_CUSTOM_CONTRACT_SET_EVENT =
  "event CustomContractSet(address indexed nativeToken, address indexed customContract, address indexed setBy);";

export const BSC_L1_CROSS_CHAIN_CONTROLLER =
  "0x93559892d3c7f66de4570132d68b69bd3c369a7c";

export const L1_ERC20_TOKEN_GATEWAYS = [
  {
    name: "Optimism",
    address: OPTIMISM_L1ERC20_TOKEN_BRIDGE,
  },
  {
    name: "Base",
    address: BASE_L1ERC20_TOKEN_BRIDGE,
  },
  {
    name: "ZkSync",
    address: ZKSYNC_L1ERC20_BRIDGE,
  },
  {
    name: "Mantle",
    address: MANTLE_L1ERC20_TOKEN_BRIDGE,
  },
  {
    name: "Linea",
    address: LINEA_L1_TOKEN_BRIDGE,
  },
  {
    name: "Scroll",
    address: SCROLL_L1_TOKEN_BRIDGE,
  },
];

export const L1_BRIDGES: BridgeProxyInfo[] = [
  {
    name: "L1ERC20TokenBridge to Optimism",
    address: OPTIMISM_L1ERC20_TOKEN_BRIDGE,
    shortABI: JSON.stringify(ossifiableProxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
    proxyAdminAddress: null,
  },
  {
    name: "L1ERC20TokenBridge to BASE",
    address: BASE_L1ERC20_TOKEN_BRIDGE,
    shortABI: JSON.stringify(ossifiableProxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
    proxyAdminAddress: null,
  },
  {
    name: "L1ERC20TokenBridge to ZkSync",
    address: ZKSYNC_L1ERC20_BRIDGE,
    shortABI: JSON.stringify(ossifiableProxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
    proxyAdminAddress: null,
  },
  {
    name: "ZkSync L1Executor",
    address: ZKSYNC_L1EXECUTOR,
    shortABI: JSON.stringify(ossifiableProxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
    proxyAdminAddress: null,
  },
  {
    name: "L1ERC20TokenBridge to Mantle",
    address: MANTLE_L1ERC20_TOKEN_BRIDGE,
    shortABI: JSON.stringify(ossifiableProxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
    proxyAdminAddress: null,
  },
  {
    name: "L1 TokenBridge to Linea",
    address: LINEA_L1_TOKEN_BRIDGE,
    shortABI: JSON.stringify(proxyAdminABI),
    functions: new Map<string, string>([
      ["admin", "getProxyAdmin"],
      ["implementation", "getProxyImplementation"],
    ]),
    proxyAdminAddress: ADMIN_OF_LINEA_L1_TOKEN_BRIDGE,
  },
  {
    name: "L1 TokenBridge to Scroll",
    address: SCROLL_L1_TOKEN_BRIDGE,
    shortABI: JSON.stringify(proxyAdminABI),
    functions: new Map<string, string>([
      ["admin", "getProxyAdmin"],
      ["implementation", "getProxyImplementation"],
    ]),
    proxyAdminAddress: ADMIN_OF_SCROLL_L1_TOKEN_BRIDGE,
  },
];

export const L1_BRIDGES_PROXY_EVENTS: EventOfNotice[] = L1_BRIDGES.map(
  (proxyInfo: BridgeProxyInfo) => {
    const eventsDesc: EventOfNotice[] = [
      {
        address: proxyInfo.address,
        event: "event ProxyOssified()",
        alertId: "PROXY-OSSIFIED",
        name: `🚨 ${proxyInfo.name}: Proxy ossified`,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        description: (args: Result) =>
          `Proxy for ${proxyInfo.name}(${proxyInfo.address}) was ossified` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: proxyInfo.address,
        event: "event AdminChanged(address previousAdmin, address newAdmin)",
        alertId: "PROXY-ADMIN-CHANGED",
        name: `🚨🚨🚨 ${proxyInfo.name}: Proxy admin changed`,
        description: (args: Result) =>
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
        name: `🚨🚨🚨 ${proxyInfo.name}: Proxy upgraded`,
        description: (args: Result) =>
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
        description: (args: Result) =>
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

const OPTIMISM_L1_CROSS_DOMAIN_MESSENGER_EVENTS = [
  {
    address: OPTIMISM_L1_CROSS_DOMAIN_MESSENGER, // Optimism: Proxy OVM L1 Cross Domain Messenger
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Optimism Native Bridge: OVM L1 Cross Domain Messenger proxy admin changed",
    description: (args: Result) =>
      `Proxy admin for Optimism: OVM L1 Cross Domain Messenger ` +
      `was changed\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: OPTIMISM_L1_CROSS_DOMAIN_MESSENGER, // Optimism: Proxy OVM L1 Cross Domain Messenger
    event:
      "event AddressSet(string indexed _name, address _newAddress,address _oldAddress)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Optimism Native Bridge: OVM L1 Cross Domain Messenger proxy upgraded",
    description: (args: Result) =>
      `Proxy for Optimism: Proxy OVM L1 Cross Domain Messenger ` +
      `was upgraded form: ${args._oldAddress} to: ${args._newAddress}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
];

const BASE_L1_CROSS_DOMAIN_MESSENGER_EVENTS = [
  {
    address: BASE_L1_CROSS_DOMAIN_MESSENGER, // Base: Proxy OVM L1 Cross Domain Messenger
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Base Native Bridge: OVM L1 Cross Domain Messenger proxy admin changed",
    description: (args: Result) =>
      `Proxy admin for Base: OVM L1 Cross Domain Messenger ` +
      `was changed\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: BASE_L1_CROSS_DOMAIN_MESSENGER, // Base: Proxy OVM L1 Cross Domain Messenger
    event:
      "event AddressSet(string indexed _name, address _newAddress,address _oldAddress)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Base Native Bridge: OVM L1 Cross Domain Messenger proxy upgraded",
    description: (args: Result) =>
      `Proxy for Base: Proxy OVM L1 Cross Domain Messenger ` +
      `was upgraded form: ${args._oldAddress} to: ${args._newAddress}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
];

const ZKSYNC_L1_DIAMOND_PROXY_EVENTS = [
  {
    address: ZKSYNC_L1_DIAMOND_PROXY, // ZkSync: DIAMOND proxy has changed
    event:
      "event DiamondCut(FacetCut[] facetCuts, address initAddress, bytes initCalldata)",
    alertId: "THIRD-PARTY-PROXY-DIAMOND-CUT-CHANGED",
    name: "🚨 ZkSync Native Bridge: Diamond Proxy changed",
    description: (args: Result) =>
      `Proxy diamondCut for ZkSync: OVM L1 Cross Domain Messenger ` +
      `was changed\n: ${args}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
];

const MANTLE_L1_CROSS_DOMAIN_MESSENGER_EVENTS = [
  {
    address: MANTLE_L1_CROSS_DOMAIN_MESSENGER,
    event:
      "event AddressSet(string indexed _name, address _newAddress, address _oldAddress)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Mantle Native Bridge: OVM L1 Cross Domain Messenger proxy upgraded",
    description: (args: Result) =>
      `Proxy for Mantle: Proxy OVM L1 Cross Domain Messenger ` +
      `was upgraded form: ${args._oldAddress} to: ${args._newAddress}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: MANTLE_L1_CROSS_DOMAIN_MESSENGER,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Mantle Native Bridge: OVM L1 Cross Domain Messenger proxy admin changed",
    description: (args: Result) =>
      `Proxy admin for Mantle: OVM L1 Cross Domain Messenger ` +
      `was changed\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
];

const LINEA_L1_CROSS_DOMAIN_MESSENGER_EVENTS = [
  {
    address: LINEA_L1_CROSS_DOMAIN_MESSENGER,
    event:
      "event MessageServiceUpdated(address indexed newMessageService, address indexed oldMessageService,address indexed setBy)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Linea Native Bridge: L1 Message Service changed",
    description: (args: Result) =>
      `Proxy for Linea: L1 Message Service was upgraded form: ${args._oldAddress} to: ${args._newAddress}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: LINEA_L1_CROSS_DOMAIN_MESSENGER,
    event:
      "event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-STARTED-CHANGE",
    name: "🚨 Linea Native Bridge: L1 Token Bridge proxy admin started to change",
    description: (args: Result) =>
      `Proxy admin for Linea: L1 Token Bridge started to change\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: LINEA_L1_CROSS_DOMAIN_MESSENGER,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Linea Native Bridge: L1 Cross Domain Messenger proxy admin changed",
    description: (args: Result) =>
      `Proxy admin of L1 Cross Domain Messenger ${LINEA_L1_CROSS_DOMAIN_MESSENGER} was changed` +
      `\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
];

const SCROLL_L1_MESSENGER_PROXY_EVENTS = [
  {
    address: SCROLL_L1_MESSENGER,
    event: "event AdminChanged(address previousAdmin, address newAdmin)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Scroll Native Bridge: L1 Messenger proxy admin changed",
    description: (args: Result) =>
      `Proxy admin of Scroll L1 Messenger ${SCROLL_L1_MESSENGER} ` +
      `changed\nfrom: ${args.previousAdmin}\nto: ${args.newAdmin}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_MESSENGER,
    event: "event Upgraded(address indexed implementation)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Scroll Native Bridge: L1 Messenger proxy upgraded",
    description: (args: Result) =>
      `Proxy of Scroll L1 Messenger ${SCROLL_L1_MESSENGER} ` +
      `was upgraded to ${args.implementation}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_MESSENGER,
    event: "event BeaconUpgraded(address indexed beacon)",
    alertId: "THIRD-PARTY-PROXY-BEACON-UPGRADED",
    name: "🚨 Scroll Native Bridge: L1 Messenger proxy beacon upgraded",
    description: (args: Result) =>
      `Proxy beacon of Scroll L1 Messenger ${SCROLL_L1_MESSENGER} ` +
      `was upgraded to ${args.implementation}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
];

const SCROLL_L1_MESSENGER_EVENTS = [
  {
    address: SCROLL_L1_MESSENGER,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-OWNER-CHANGED",
    name: "🚨 Scroll Native Bridge: L1 Messenger owner changed",
    description: (args: Result) =>
      `Owner of Scroll L1 Messenger ${SCROLL_L1_MESSENGER} changed` +
      `\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_MESSENGER,
    event: "event Initialized(uint8 version)",
    alertId: "THIRD-PARTY-INITIALIZED",
    name: "🚨 Scroll Native Bridge: L1 Messenger (re-)initialized",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    description: (args: Result) =>
      `Scroll L1 Messenger ${SCROLL_L1_MESSENGER} (re-)initialized`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_MESSENGER,
    event: "event Paused(address account)",
    alertId: "THIRD-PARTY-MESSENGER-PAUSED",
    name: "🚨 Scroll Native Bridge: L1 Messenger paused",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    description: (args: Result) =>
      `Scroll L1 Messenger ${SCROLL_L1_MESSENGER} paused`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_MESSENGER,
    event: "event Unpaused(address account)",
    alertId: "THIRD-PARTY-MESSENGER-UNPAUSED",
    name: "🚨 Scroll Native Bridge: L1 Messenger unpaused",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    description: (args: Result) =>
      `Scroll L1 Messenger ${SCROLL_L1_MESSENGER} unpaused`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  // There is also `event UpdateFeeVault(address _oldFeeVault, address _newFeeVault)`,
  // but it is skipped as not significant enough
];

const SCROLL_L1_GATEWAY_ROUTER_PROXY_EVENTS = [
  {
    address: SCROLL_L1_GATEWAY_ROUTER,
    event: "event AdminChanged(address previousAdmin, address newAdmin)",
    alertId: "THIRD-PARTY-PROXY-ADMIN-CHANGED",
    name: "🚨 Scroll Native Bridge: L1 Gateway Router proxy admin changed",
    description: (args: Result) =>
      `Proxy admin of Scroll L1 Gateway Router ${SCROLL_L1_GATEWAY_ROUTER} ` +
      `changed\nfrom: ${args.previousAdmin}\nto: ${args.newAdmin}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_GATEWAY_ROUTER,
    event: "event Upgraded(address indexed implementation)",
    alertId: "THIRD-PARTY-PROXY-UPGRADED",
    name: "🚨 Scroll Native Bridge: L1 Gateway Router proxy upgraded",
    description: (args: Result) =>
      `Proxy of Scroll L1 Gateway Router ${SCROLL_L1_GATEWAY_ROUTER} ` +
      `was upgraded to ${args.implementation}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_GATEWAY_ROUTER,
    event: "event BeaconUpgraded(address indexed beacon)",
    alertId: "THIRD-PARTY-PROXY-BEACON-UPGRADED",
    name: "🚨 Scroll Native Bridge: L1 Gateway Router proxy beacon upgraded",
    description: (args: Result) =>
      `Proxy beacon of Scroll L1 Gateway Router ${SCROLL_L1_GATEWAY_ROUTER} ` +
      `was upgraded to ${args.implementation}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
];

const SCROLL_L1_GATEWAY_ROUTER_EVENTS = [
  {
    address: SCROLL_L1_GATEWAY_ROUTER,
    event:
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
    alertId: "THIRD-PARTY-OWNER-CHANGED",
    name: "🚨 Scroll Native Bridge: L1 Gateway Router owner changed",
    description: (args: Result) =>
      `Owner of Scroll L1 Gateway Router ${SCROLL_L1_GATEWAY_ROUTER} changed` +
      `\nfrom: ${args.previousOwner}\nto: ${args.newOwner}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_GATEWAY_ROUTER,
    event: "event Initialized(uint8 version)",
    alertId: "THIRD-PARTY-INITIALIZED",
    name: "🚨 Scroll Native Bridge: L1 Gateway Router (re-)initialized",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    description: (args: Result) =>
      `Scroll L1 Gateway Router ${SCROLL_L1_GATEWAY_ROUTER} (re-)initialized`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: SCROLL_L1_GATEWAY_ROUTER,
    event:
      "event SetERC20Gateway(address indexed token, address indexed oldGateway, address indexed newGateway)",
    condition: (args: Result) => {
      return formatAddress(args.token) === formatAddress(WSTETH_ADDRESS);
    },
    alertId: "THIRD-PARTY-ROUTER-CHANGED",
    name: "🚨 Scroll Bridge: L1 Gateway for wstETH changed on router",
    description: (args: Result) =>
      `Scroll L1 Gateway for wstETH changed ` +
      `\nfrom ${args.oldGateway}` +
      `\nto ${args.newGateway}` +
      `\non Gateway Router ${SCROLL_L1_GATEWAY_ROUTER}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
    // Occurred in block 18318378 but than there were no Lido custom gateway contracts,
    // thus it cannot be used in tests
  },
];

const BSC_L1_CROSS_CHAIN_CONTROLLER_EVENTS = [
  {
    address: BSC_L1_CROSS_CHAIN_CONTROLLER,
    event:
      "event SenderUpdated(address indexed sender, bool indexed isApproved)",
    alertId: "BSC-ADI-APPROVED-SENDER-UPDATED",
    name: "🚨🚨🚨 BSC a.DI: Approved sender changed",
    description: (args: Result) =>
      args.isApproved
        ? `Address ${args.sender} was set as an approved sender`
        : `Address ${args.sender} was removed from the approved senders list`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
];

export const THIRD_PARTY_PROXY_EVENTS: EventOfNotice[] =
  OPTIMISM_L1_CROSS_DOMAIN_MESSENGER_EVENTS.concat(
    BASE_L1_CROSS_DOMAIN_MESSENGER_EVENTS,
  )
    .concat(ZKSYNC_L1_DIAMOND_PROXY_EVENTS)
    .concat(MANTLE_L1_CROSS_DOMAIN_MESSENGER_EVENTS)
    .concat(LINEA_L1_CROSS_DOMAIN_MESSENGER_EVENTS)
    .concat(SCROLL_L1_MESSENGER_PROXY_EVENTS)
    .concat(SCROLL_L1_MESSENGER_EVENTS)
    .concat(SCROLL_L1_GATEWAY_ROUTER_PROXY_EVENTS)
    .concat(SCROLL_L1_GATEWAY_ROUTER_EVENTS)
    .concat(BSC_L1_CROSS_CHAIN_CONTROLLER_EVENTS);

export const L1_BRIDGE_EVENTS: EventOfNotice[] = L1_ERC20_TOKEN_GATEWAYS.map(
  (gw) => {
    return [
      {
        address: gw.address,
        event:
          "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
        alertId: "L1-BRIDGE-ROLE-ADMIN-CHANGED",
        name: `⚠️ ${gw.name} L1 Bridge: Role Admin changed`,
        description: (args: Result) =>
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
        description: (args: Result) =>
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
        description: (args: Result) =>
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
        description: (args: Result) =>
          `Deposits were enabled by ${args.enabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event DepositsDisabled(address indexed disabler)",
        alertId: "L1-BRIDGE-DEPOSITS-DISABLED",
        name: `❌ ${gw.name} L1 Bridge: Deposits Disabled`,
        description: (args: Result) =>
          `Deposits were disabled by ${args.disabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event WithdrawalsEnabled(address indexed enabler)",
        alertId: "L1-BRIDGE-WITHDRAWALS-ENABLED",
        name: `✅ ${gw.name} L1 Bridge: Withdrawals Enabled`,
        description: (args: Result) =>
          `Withdrawals were enabled by ${args.enabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event WithdrawalsDisabled(address indexed disabler)",
        alertId: "L1-BRIDGE-WITHDRAWALS-DISABLED",
        name: `❌ ${gw.name} L1 Bridge: Withdrawals Disabled`,
        description: (args: Result) =>
          `Withdrawals were disabled by ${args.enabler}`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: gw.address,
        event: "event Initialized(address indexed admin)",
        alertId: "L1-BRIDGE-IMPLEMENTATION-INITIALIZED",
        name: `🚨 ${gw.name} L1 Bridge: Implementation initialized`,
        description: (args: Result) =>
          `Implementation of the ${gw.name} L1 Bridge was initialized by ${args.admin}\n` +
          `NOTE: This is not the thing that should be left unacted! ` +
          `Make sure that this call was made by Lido!`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
    ];
  },
).reduce((a, b) => [...a, ...b]);
