import { EventOfNotice, TransactionDtoTx } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { getSafeLink, getSafeTxLink, getTxLink } from '../../shared/string'
import { MELLOW_VAULT_ADMIN_MULTISIGS } from 'constants/common'

const MSIG_ADDED_OWNER_EVENT = 'event AddedOwner(address owner)'
const MSIG_REMOVED_OWNER_EVENT = 'event RemovedOwner(address owner)'
const MSIG_CHANGED_FALLBACK_HANDLER_EVENT = 'event ChangedFallbackHandler(address handler)'
const MSIG_CHANGED_GUARD_EVENT = 'event ChangedGuard(address guard)'
const MSIG_CHANGED_THRESHOLD_EVENT = 'event ChangedThreshold(uint256 threshold)'
const MSIG_DISABLED_MODULE_EVENT = 'event DisabledModule(address module)'
const MSIG_ENABLED_MODULE_EVENT = 'event EnabledModule(address module)'
const MSIG_EXECUTION_FAILURE_EVENT = 'event ExecutionFailure(bytes32 txHash, uint256 payment)'
const MSIG_EXECUTION_SUCCESS_EVENT = 'event ExecutionSuccess(bytes32 txHash, uint256 payment)'
const MSIG_EXECUTION_FROM_MODULE_FAILURE_EVENT = 'event ExecutionFromModuleFailure(address module)'
const MSIG_EXECUTION_FROM_MODULE_SUCCESS_EVENT = 'event ExecutionFromModuleSuccess(address module)'

export const MSIG_EVENTS = [
  MSIG_ADDED_OWNER_EVENT,
  MSIG_REMOVED_OWNER_EVENT,
  MSIG_CHANGED_FALLBACK_HANDLER_EVENT,
  MSIG_CHANGED_GUARD_EVENT,
  MSIG_CHANGED_THRESHOLD_EVENT,
  MSIG_DISABLED_MODULE_EVENT,
  MSIG_ENABLED_MODULE_EVENT,
  MSIG_EXECUTION_FAILURE_EVENT,
  MSIG_EXECUTION_SUCCESS_EVENT,
  MSIG_EXECUTION_FROM_MODULE_FAILURE_EVENT,
  MSIG_EXECUTION_FROM_MODULE_SUCCESS_EVENT,
]

const safes = MELLOW_VAULT_ADMIN_MULTISIGS

const safeTx = (args: Result, address: string, tx: TransactionDtoTx) => {
  const [safeAddress, safeName] = safes.find((item) => item[0] === address) ?? []
  return {
    tx: tx.hash,
    safeAddress,
    safeName,
    safeTx: args.txHash || '',
  }
}

export const safeNotices: Record<string, EventOfNotice> = {
  AddedOwner: {
    address: '',
    event: MSIG_ADDED_OWNER_EVENT,
    alertId: 'SAFE-OWNER-ADDED',
    name: '🚨 Gnosis Safe: Owner added',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `New owner ${args.owner} was added to ${getSafeLink(safeTx(args, address, tx))}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: '14f4c38e-7e1e-49df-af02-6c582e79158c',
  },
  RemovedOwner: {
    address: '',
    event: MSIG_REMOVED_OWNER_EVENT,
    alertId: 'SAFE-OWNER-REMOVED',
    name: '🚨 Gnosis Safe: Owner removed',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `Owner ${args.owner} was removed from ${getSafeLink(safeTx(args, address, tx))}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: '6a6b7566-b398-49f7-95d0-a8353fe53429',
  },
  ChangedFallbackHandler: {
    address: '',
    event: MSIG_CHANGED_FALLBACK_HANDLER_EVENT,
    alertId: 'SAFE-HANDLER-CHANGED',
    name: '🚨 Gnosis Safe: Fallback handler changed',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `Fallback handler for ${getSafeLink(safeTx(args, address, tx))} ` + `was changed to ${args.handler}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: '8c4fda92-35ea-4370-8bc8-9d9f952859f7',
  },
  ChangedGuard: {
    address: '',
    event: MSIG_CHANGED_GUARD_EVENT,
    alertId: 'SAFE-GUARD-CHANGED',
    name: '🚨 Gnosis Safe: Guard changed',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `Guard for ${getSafeLink(safeTx(args, address, tx))} was changed to ${args.guard}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: '1af528e5-d397-437c-ab19-0921c1443b3f',
  },
  ChangedThreshold: {
    address: '',
    event: MSIG_CHANGED_THRESHOLD_EVENT,
    alertId: 'SAFE-THRESHOLD-CHANGED',
    name: '🚨 Gnosis Safe: Threshold changed',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `Threshold for ${getSafeLink(safeTx(args, address, tx))} was changed to ${args.threshold}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: 'e70d0bb5-0033-4f34-a1cc-3b9f177f215f',
  },
  DisabledModule: {
    address: '',
    event: MSIG_DISABLED_MODULE_EVENT,
    alertId: 'SAFE-MODULE-DISABLED',
    name: '🚨 Gnosis Safe: Module disabled',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `Module ${args.module} was disabled for ${getSafeLink(safeTx(args, address, tx))}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: 'cbfb31ed-b0e1-4007-a2ae-940de626ff2e',
  },
  EnabledModule: {
    address: '',
    event: MSIG_ENABLED_MODULE_EVENT,
    alertId: 'SAFE-MODULE-ENABLED',
    name: '🚨 Gnosis Safe: Module enabled',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `Module ${args.module} was enabled for ${getSafeLink(safeTx(args, address, tx))}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: 'cc404aa8-a31e-4fce-9c59-8f0b2a5d41a5',
  },
  ExecutionFailure: {
    address: '',
    event: MSIG_EXECUTION_FAILURE_EVENT,
    alertId: 'SAFE-EXECUTION-FAILURE',
    name: '❌ Gnosis Safe: TX Execution failed',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `[TX](${getSafeTxLink(safeTx(args, address, tx))}) execution failed for ` +
      `${getSafeLink(safeTx(args, address, tx))}\n` +
      `[blockchain explorer](${getTxLink(safeTx(args, address, tx))})`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    uniqueKey: '15587c71-32ce-44ea-8232-67676f3ba848',
  },
  ExecutionSuccess: {
    address: '',
    event: MSIG_EXECUTION_SUCCESS_EVENT,
    alertId: 'SAFE-EXECUTION-SUCCESS',
    name: '✅ Gnosis Safe: TX Executed',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `[TX](${getSafeTxLink(safeTx(args, address, tx))}) executed by ${getSafeLink(safeTx(args, address, tx))}\n` +
      `[blockchain explorer](${getTxLink(safeTx(args, address, tx))})`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    uniqueKey: '8dd6c439-842b-4a2a-a7e8-b404ffbac5ce',
  },
  ExecutionFromModuleFailure: {
    address: '',
    event: MSIG_EXECUTION_FROM_MODULE_FAILURE_EVENT,
    alertId: 'SAFE-EXECUTION-FAILURE-FROM-MODULE',
    name: '❌ Gnosis Safe: Execution failed from module',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `TX execution failed for ${getSafeLink(safeTx(args, address, tx))} ` + `from module ${args.module}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    uniqueKey: 'aaf17ef8-ea92-47f6-8663-c11b0c61a1c6',
  },
  ExecutionFromModuleSuccess: {
    address: '',
    event: MSIG_EXECUTION_FROM_MODULE_SUCCESS_EVENT,
    alertId: 'SAFE-EXECUTION-SUCCESS-FROM-MODULE',
    name: '✅ Gnosis Safe: Execution success from module',
    description: (args: Result, address: string, tx: TransactionDtoTx) =>
      `Execution success for ${getSafeLink(safeTx(args, address, tx))} from module ${args.module}`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    uniqueKey: '801cb979-5b3f-42b3-a471-4195112b2fd2',
  },
}
