import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../types'

export function getCrossChainExecutorEvents(crossChainExecutorAddress: string): EventOfNotice[] {
  return [
    {
      address: crossChainExecutorAddress,
      event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
      alertId: 'BSC-ADI-GUARDIAN-UPDATED',
      name: '🚨🚨🚨 BSC a.DI: Guardians updated',
      description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: crossChainExecutorAddress,
      event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
      alertId: 'BSC-ADI-DELAY-UPDATED',
      name: '⚠️ BSC a.DI: Cross-chain executor delay updated',
      description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    },
    {
      address: crossChainExecutorAddress,
      event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
      alertId: 'BSC-ADI-GRACE-PERIOD-UPDATED',
      name: '⚠️ BSC a.DI: Cross-chain executor Grace Period updated',
      description: (args: Result) =>
        `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    },
    {
      address: crossChainExecutorAddress,
      event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
      alertId: 'BSC-ADI-MIN-DELAY-UPDATED',
      name: '⚠️ BSC a.DI: Cross-chain executor Min Delay updated',
      description: (args: Result) =>
        `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    },
    {
      address: crossChainExecutorAddress,
      event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
      alertId: 'BSC-ADI-MAX-DELAY-UPDATED',
      name: '⚠️ BSC a.DI: Cross-chain executor Max Delay updated',
      description: (args: Result) =>
        `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    },
    {
      address: crossChainExecutorAddress,
      event:
        'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
      alertId: 'BSC-ADI-ACTION-SET-QUEUED',
      name: 'ℹ️ BSC a.DI: Action set queued',
      description: (args: Result) => `Action set ${args.id} was queued`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
    {
      address: crossChainExecutorAddress,
      event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
      alertId: 'BSC-ADI-ACTION-SET-EXECUTED',
      name: 'ℹ️ BSC a.DI: Action set executed',
      description: (args: Result) => `Action set ${args.id} was executed`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
    {
      address: crossChainExecutorAddress,
      event: 'event ActionsSetCanceled(uint256 indexed id)',
      alertId: 'BSC-ADI-ACTION-SET-CANCELED',
      name: 'ℹ️ BSC a.DI: Action set canceled',
      description: (args: Result) => `Action set ${args.id} was canceled`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
  ]
}
