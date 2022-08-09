import BigNumber from "bignumber.js";
import { FindingSeverity, FindingType } from "forta-agent";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);

// ADDRESSES AND EVENTS

export const GOV_BRIDGE_ADDRESS = "0x1dca41859cd23b526cbe74da8f48ac96e14b1a29";

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
      `Ethereum Governance Delay was updated from ` +
      `${args.oldDelay} to ${args.newDelay}`,
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
      `Ethereum Governance Grace Period was updated from ` +
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
      `Ethereum Governance Executor was updated from ` +
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
      `Ethereum Governance Executor was updated from ` +
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
