import { FindingSeverity } from "forta-agent";

interface BlockchainUrls {
  safeUrlPrefix: string;
  txUrlPrefix: string;
  safeTxUrlPrefix: string;
}

export interface SafeTX {
  safeAddress: string;
  safeName: string;
  tx: string;
  safeTx: string;
}

export interface EventsOfNotice {
  event: string;
  alertId: string;
  name: string;
  description: (safeTx: SafeTX, args: any) => string;
  severity: FindingSeverity;
}

export const getEventsOfNoticeForSafe = (
  alertPrefix: string,
  alertName: string,
  blockchainUrls: BlockchainUrls,
): EventsOfNotice[] => {
  const { safeTxUrlPrefix, safeUrlPrefix, txUrlPrefix } = blockchainUrls;

  return [
    {
      event: "event AddedOwner(address owner)",
      alertId: `${alertPrefix}OWNER-ADDED`,
      name: `🚨 ${alertName}: Owner added`,
      description: (safeTx: SafeTX, args: any) =>
        `New owner ${args.owner} was added to ${getSafeLink(
          safeTx,
          safeUrlPrefix,
        )}`,
      severity: FindingSeverity.Medium,
    },
    {
      event: "event RemovedOwner(address owner)",
      alertId: `${alertPrefix}OWNER-REMOVED`,
      name: `🚨 ${alertName}: Owner removed`,
      description: (safeTx: SafeTX, args: any) =>
        `Owner ${args.owner} was removed from ${getSafeLink(
          safeTx,
          safeUrlPrefix,
        )}`,
      severity: FindingSeverity.Medium,
    },
    {
      event: "event ChangedFallbackHandler(address handler)",
      alertId: `${alertPrefix}HANDLER-CHANGED`,
      name: `🚨 ${alertName}: Fallback handler changed`,
      description: (safeTx: SafeTX, args: any) =>
        `Fallback handler for ${getSafeLink(safeTx, safeUrlPrefix)} ` +
        `was changed to ${args.handler}`,
      severity: FindingSeverity.Medium,
    },
    {
      event: "event ChangedGuard(address guard)",
      alertId: `${alertPrefix}GUARD-CHANGED`,
      name: `🚨 ${alertName}: Guard changed`,
      description: (safeTx: SafeTX, args: any) =>
        `Guard for ${getSafeLink(safeTx, safeUrlPrefix)} was changed to ${
          args.guard
        }`,
      severity: FindingSeverity.Medium,
    },
    {
      event: "event ChangedThreshold(uint256 threshold)",
      alertId: `${alertPrefix}THRESHOLD-CHANGED`,
      name: `🚨 ${alertName}: Threshold changed`,
      description: (safeTx: SafeTX, args: any) =>
        `Threshold for ${getSafeLink(safeTx, safeUrlPrefix)} was changed to ${
          args.threshold
        }`,
      severity: FindingSeverity.Medium,
    },
    {
      event: "event DisabledModule(address module)",
      alertId: `${alertPrefix}MODULE-DISABLED`,
      name: `🚨 ${alertName}: Module disabled`,
      description: (safeTx: SafeTX, args: any) =>
        `Module ${args.module} was disabled for ${getSafeLink(
          safeTx,
          safeUrlPrefix,
        )}`,
      severity: FindingSeverity.Medium,
    },
    {
      event: "event EnabledModule(address module)",
      alertId: `${alertPrefix}MODULE-ENABLED`,
      name: `🚨 ${alertName}: Module enabled`,
      description: (safeTx: SafeTX, args: any) =>
        `Module ${args.module} was enabled for ${getSafeLink(
          safeTx,
          safeUrlPrefix,
        )}`,
      severity: FindingSeverity.Medium,
    },
    {
      event: "event ExecutionFailure(bytes32 txHash, uint256 payment)",
      alertId: `${alertPrefix}EXECUTION-FAILURE`,
      name: `❌ ${alertName}: TX Execution failed`,
      description: (safeTx: SafeTX, args: any) =>
        `[TX](${getSafeTxLink(
          safeTx,
          safeTxUrlPrefix,
        )}) execution failed for ` +
        `${getSafeLink(safeTx, safeUrlPrefix)}\n` +
        `[blockchain explorer](${getTxLink(safeTx, txUrlPrefix)})`,
      severity: FindingSeverity.Info,
    },
    {
      event: "event ExecutionSuccess(bytes32 txHash, uint256 payment)",
      alertId: `${alertPrefix}EXECUTION-SUCCESS`,
      name: `✅ ${alertName}: TX Executed`,
      description: (safeTx: SafeTX, args: any) =>
        `[TX](${getSafeTxLink(
          safeTx,
          safeTxUrlPrefix,
        )}) executed by ${getSafeLink(safeTx, safeUrlPrefix)}\n` +
        `[blockchain explorer](${getTxLink(safeTx, txUrlPrefix)})`,
      severity: FindingSeverity.Info,
    },
    {
      event: "event ExecutionFromModuleFailure(address module)",
      alertId: `${alertPrefix}EXECUTION-FAILURE-FROM-MODULE`,
      name: `❌ ${alertName}: Execution failed from module`,
      description: (safeTx: SafeTX, args: any) =>
        `TX execution failed for ${getSafeLink(safeTx, safeUrlPrefix)} ` +
        `from module ${args.module}`,
      severity: FindingSeverity.Info,
    },
    {
      event: "event ExecutionFromModuleSuccess(address module)",
      alertId: `${alertPrefix}EXECUTION-SUCCESS-FROM-MODULE`,
      name: `✅ ${alertName}: Execution success from module`,
      description: (safeTx: SafeTX, args: any) =>
        `Execution success for ${getSafeLink(
          safeTx,
          safeUrlPrefix,
        )} from module ${args.module}`,
      severity: FindingSeverity.Info,
    },
  ];
};

function getSafeLink(safeTx: SafeTX, safeUrlPrefix: string): string {
  return `[${safeTx.safeName}](${safeUrlPrefix}${safeTx.safeAddress})`;
}

function getTxLink(safeTx: SafeTX, txUrlPrefix: string): string {
  return `${txUrlPrefix}${safeTx.tx}`;
}

function getSafeTxLink(safeTx: SafeTX, safeTxUrlPrefix: string): string {
  return `${safeTxUrlPrefix}${safeTx.safeAddress}&id=multisig_${safeTx.safeAddress}_${safeTx.safeTx}`;
}
