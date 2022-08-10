import BigNumber from "bignumber.js";
import { FindingSeverity, FindingType } from "forta-agent";

import proxyShortABI from "./abi/ProxyShortABI.json";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

// ADDRESSES AND EVENTS

export const GOV_BRIDGE_ADDRESS = "0xefa0db536d2c8089685630fafe88cf7805966fc3";

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
    name: "Optimism Gov Bridge: Ethereum Governance Executor Updated",
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
    name: "Optimism Gov Bridge: Guardian Updated",
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
    name: "Optimism Gov Bridge: Delay Updated",
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
    name: "Optimism Gov Bridge: Grace Period Updated",
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
    name: "Optimism Gov Bridge: Min Delay Updated",
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
    name: "Optimism Gov Bridge: Max Delay Updated",
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
    name: "Optimism Gov Bridge: Action set queued",
    description: (args: any) => `Action set ${args.id} was queued`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event:
      "event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)",
    alertId: "GOV-BRIDGE-ACTION-SET-EXECUTED",
    name: "Optimism Gov Bridge: Action set executed",
    description: (args: any) => `Action set ${args.id} was executed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: GOV_BRIDGE_ADDRESS,
    event: "event ActionsSetCanceled(uint256 indexed id)",
    alertId: "GOV-BRIDGE-ACTION-SET-CANCELED",
    name: "Optimism Gov Bridge: Action set canceled",
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
    address: "0x1f32b1c2345538c0c6f582fcb022739c4a194ebb",
    shortABI: JSON.stringify(proxyShortABI),
    functions: new Map<string, string>([
      ["admin", "proxy__getAdmin"],
      ["implementation", "proxy__getImplementation"],
    ]),
  },
  {
    name: "L2ERC20TokenGateway",
    address: "0x8e01013243a96601a86eb3153f0d9fa4fbfb6957",
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
