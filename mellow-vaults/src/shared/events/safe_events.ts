import { FindingSeverity } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { SafeTX } from 'constants/common'
import { getSafeLink, getSafeTxLink, getTxLink } from '../string'

export const GNOSIS_SAFE_EVENTS_OF_NOTICE = [
  {
    event: 'event AddedOwner(address owner)',
    alertId: 'SAFE-OWNER-ADDED',
    name: '🚨 Gnosis Safe: Owner added',
    description: (safeTx: SafeTX, args: Result) => `New owner ${args.owner} was added to ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: 'event RemovedOwner(address owner)',
    alertId: 'SAFE-OWNER-REMOVED',
    name: '🚨 Gnosis Safe: Owner removed',
    description: (safeTx: SafeTX, args: Result) => `Owner ${args.owner} was removed from ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: 'event ChangedFallbackHandler(address handler)',
    alertId: 'SAFE-HANDLER-CHANGED',
    name: '🚨 Gnosis Safe: Fallback handler changed',
    description: (safeTx: SafeTX, args: Result) =>
      `Fallback handler for ${getSafeLink(safeTx)} ` + `was changed to ${args.handler}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: 'event ChangedGuard(address guard)',
    alertId: 'SAFE-GUARD-CHANGED',
    name: '🚨 Gnosis Safe: Guard changed',
    description: (safeTx: SafeTX, args: Result) => `Guard for ${getSafeLink(safeTx)} was changed to ${args.guard}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: 'event ChangedThreshold(uint256 threshold)',
    alertId: 'SAFE-THRESHOLD-CHANGED',
    name: '🚨 Gnosis Safe: Threshold changed',
    description: (safeTx: SafeTX, args: Result) =>
      `Threshold for ${getSafeLink(safeTx)} was changed to ${args.threshold}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: 'event DisabledModule(address module)',
    alertId: 'SAFE-MODULE-DISABLED',
    name: '🚨 Gnosis Safe: Module disabled',
    description: (safeTx: SafeTX, args: Result) => `Module ${args.module} was disabled for ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: 'event EnabledModule(address module)',
    alertId: 'SAFE-MODULE-ENABLED',
    name: '🚨 Gnosis Safe: Module enabled',
    description: (safeTx: SafeTX, args: Result) => `Module ${args.module} was enabled for ${getSafeLink(safeTx)}`,
    severity: FindingSeverity.Medium,
  },
  {
    event: 'event ExecutionFailure(bytes32 txHash, uint256 payment)',
    alertId: 'SAFE-EXECUTION-FAILURE',
    name: '❌ Gnosis Safe: TX Execution failed',
    description: (safeTx: SafeTX, args: Result) =>
      `[TX](${getSafeTxLink(safeTx)}) execution failed for ` +
      `${getSafeLink(safeTx)}\n` +
      `[blockchain explorer](${getTxLink(safeTx)})`,
    severity: FindingSeverity.Info,
  },
  {
    event: 'event ExecutionSuccess(bytes32 txHash, uint256 payment)',
    alertId: 'SAFE-EXECUTION-SUCCESS',
    name: '✅ Gnosis Safe: TX Executed',
    description: (safeTx: SafeTX, args: Result) =>
      `[TX](${getSafeTxLink(safeTx)}) executed by ${getSafeLink(safeTx)}\n` +
      `[blockchain explorer](${getTxLink(safeTx)})`,
    severity: FindingSeverity.Info,
  },
  {
    event: 'event ExecutionFromModuleFailure(address module)',
    alertId: 'SAFE-EXECUTION-FAILURE-FROM-MODULE',
    name: '❌ Gnosis Safe: Execution failed from module',
    description: (safeTx: SafeTX, args: Result) =>
      `TX execution failed for ${getSafeLink(safeTx)} ` + `from module ${args.module}`,
    severity: FindingSeverity.Info,
  },
  {
    event: 'event ExecutionFromModuleSuccess(address module)',
    alertId: 'SAFE-EXECUTION-SUCCESS-FROM-MODULE',
    name: '✅ Gnosis Safe: Execution success from module',
    description: (safeTx: SafeTX, args: Result) =>
      `Execution success for ${getSafeLink(safeTx)} from module ${args.module}`,
    severity: FindingSeverity.Info,
  },
]
