import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../types'

export function getCrossChainExecutorEvents(CROSS_CHAIN_EXECUTOR: string): EventOfNotice[] {
  const uniqueKeys = [
    'e39b460a-69fa-40ff-b1c7-e90aaedd707d',
    'eb9108cc-5d06-450b-87ed-a3c962e0e77f',
    '980e06e4-e745-4d06-af7a-0a830e8d9520',
    '6413fc86-b592-4ea1-8e0d-530d222b1309',
    '5d9c4f9e-70a4-4784-8a41-aebac1165135',
    '4bb06b1c-6b47-4000-89b4-a2fc577ba812',
    '017edc0c-e3b4-43da-96ed-c8c247bab8c1',
    '227da709-90e6-4e0f-9eaf-3944baab5ea0',
  ]

  return [
    {
      address: CROSS_CHAIN_EXECUTOR,
      event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
      alertId: 'BNB-ADI-GUARDIAN-UPDATED',
      name: '🚨🚨🚨  BNB a.DI: Guardians updated',
      description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: CROSS_CHAIN_EXECUTOR,
      event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
      alertId: 'BNB-ADI-DELAY-UPDATED',
      name: '⚠️ BNB a.DI: Cross-chain executor delay updated',
      description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: CROSS_CHAIN_EXECUTOR,
      event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
      alertId: 'BNB-ADI-GRACE-PERIOD-UPDATED',
      name: '⚠️ BNB a.DI: Cross-chain executor Grace Period updated',
      description: (args: Result) =>
        `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: CROSS_CHAIN_EXECUTOR,
      event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
      alertId: 'BNB-ADI-MIN-DELAY-UPDATED',
      name: '⚠️ BNB a.DI: Cross-chain executor Min Delay updated',
      description: (args: Result) =>
        `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: CROSS_CHAIN_EXECUTOR,
      event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
      alertId: 'BNB-ADI-MAX-DELAY-UPDATED',
      name: '⚠️ BNB a.DI: Cross-chain executor Max Delay updated',
      description: (args: Result) =>
        `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: CROSS_CHAIN_EXECUTOR,
      event:
        'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
      alertId: 'BNB-ADI-ACTION-SET-QUEUED',
      name: 'ℹ️ BNB a.DI: Action set queued',
      description: (args: Result) => `Action set ${args.id} was queued`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: CROSS_CHAIN_EXECUTOR,
      event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
      alertId: 'BNB-ADI-ACTION-SET-EXECUTED',
      name: 'ℹ️ BNB a.DI: Action set executed',
      description: (args: Result) => `Action set ${args.id} was executed`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: CROSS_CHAIN_EXECUTOR,
      event: 'event ActionsSetCanceled(uint256 indexed id)',
      alertId: 'BNB-ADI-ACTION-SET-CANCELED',
      name: 'ℹ️ BNB a.DI: Action set canceled',
      description: (args: Result) => `Action set ${args.id} was canceled`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
  ]
}
