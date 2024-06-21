import { FindingSeverity, FindingType, ethers } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { Log } from '@ethersproject/abstract-provider'

// ADDRESSES AND EVENTS

export type EventOfNotice = {
  address: string
  event: string
  alertId: string
  name: string
  description: CallableFunction
  severity: FindingSeverity
  type: FindingType
}

export type TransactionDto = {
  logs: Log[]
  to: string | null
  block: {
    timestamp: number
    number: number
  }
}

export type LogDescription = ethers.utils.LogDescription

const CROSS_CHAIN_EXECUTOR_ADDRESS = '0x8e5175d17f74d1d512de59b2f5d5a5d8177a123d'
export const CROSS_CHAIN_CONTROLLER_ADDRESS = '0x40c4464fca8cacd550c33b39d674fc257966022f'

export const CROSS_CHAIN_EXECUTOR_EVENTS: EventOfNotice[] = [
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
    alertId: 'BSC-ADI-GUARDIAN-UPDATED',
    name: '🚨🚨🚨 BSC a.DI: Guardians updated',
    description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
    alertId: 'BSC-ADI-DELAY-UPDATED',
    name: '⚠️ BSC a.DI: Cross-chain executor delay updated',
    description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
    alertId: 'BSC-ADI-GRACE-PERIOD-UPDATED',
    name: '⚠️ BSC a.DI: Cross-chain executor Grace Period updated',
    description: (args: Result) =>
      `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
    alertId: 'BSC-ADI-MIN-DELAY-UPDATED',
    name: '⚠️ BSC a.DI: Cross-chain executor Min Delay updated',
    description: (args: Result) => `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
    alertId: 'BSC-ADI-MAX-DELAY-UPDATED',
    name: '⚠️ BSC a.DI: Cross-chain executor Max Delay updated',
    description: (args: Result) => `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
  },
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event:
      'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
    alertId: 'BSC-ADI-ACTION-SET-QUEUED',
    name: 'ℹ️ BSC a.DI: Action set queued',
    description: (args: Result) => `Action set ${args.id} was queued`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
    alertId: 'BSC-ADI-ACTION-SET-EXECUTED',
    name: 'ℹ️ BSC a.DI: Action set executed',
    description: (args: Result) => `Action set ${args.id} was executed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: CROSS_CHAIN_EXECUTOR_ADDRESS,
    event: 'event ActionsSetCanceled(uint256 indexed id)',
    alertId: 'BSC-ADI-ACTION-SET-CANCELED',
    name: 'ℹ️ BSC a.DI: Action set canceled',
    description: (args: Result) => `Action set ${args.id} was canceled`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
]
