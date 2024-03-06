import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export function getGovEvents(GOV_BRIDGE_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: GOV_BRIDGE_ADDRESS,
      event:
        'event EthereumGovernanceExecutorUpdate(address oldEthereumGovernanceExecutor, address newEthereumGovernanceExecutor)',
      alertId: 'GOV-BRIDGE-EXEC-UPDATED',
      name: '🚨 Base Gov Bridge: Ethereum Governance Executor Updated',
      description: (args: Result) =>
        `Ethereum Governance Executor was updated from ` +
        `${args.oldEthereumGovernanceExecutor} to ${args.newEthereumGovernanceExecutor}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '791bebd4-fe0f-4ea0-86d1-6a28ef573f2f',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event GuardianUpdate(address oldGuardian, address newGuardian)',
      alertId: 'GOV-BRIDGE-GUARDIAN-UPDATED',
      name: '🚨 Base Gov Bridge: Guardian Updated',
      description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '36956c95-272a-4cfa-9f5b-cde0c6f13a11',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event DelayUpdate(uint256 oldDelay, uint256 newDelay)',
      alertId: 'GOV-BRIDGE-DELAY-UPDATED',
      name: '⚠️ Base Gov Bridge: Delay Updated',
      description: (args: Result) => `Delay was updated from ` + `${args.oldDelay} to ${args.newDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: 'bfd1f027-b6be-4685-881c-2bb8c94de4e7',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event GracePeriodUpdate(uint256 oldGracePeriod, uint256 newGracePeriod)',
      alertId: 'GOV-BRIDGE-GRACE-PERIOD-UPDATED',
      name: '⚠️ Base Gov Bridge: Grace Period Updated',
      description: (args: Result) =>
        `Grace Period was updated from ` + `${args.oldGracePeriod} to ${args.newGracePeriod}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: 'e8c5ddaf-77d7-4344-b480-d1dbcf16e838',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event MinimumDelayUpdate(uint256 oldMinimumDelay, uint256 newMinimumDelay)',
      alertId: 'GOV-BRIDGE-MIN-DELAY-UPDATED',
      name: '⚠️ Base Gov Bridge: Min Delay Updated',
      description: (args: Result) =>
        `Min Delay was updated from ` + `${args.oldMinimumDelay} to ${args.newMinimumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: 'e3801901-2425-40bd-8eda-d2d9cf1dbe2a',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event MaximumDelayUpdate(uint256 oldMaximumDelay, uint256 newMaximumDelay)',
      alertId: 'GOV-BRIDGE-MAX-DELAY-UPDATED',
      name: '⚠️ Base Gov Bridge: Max Delay Updated',
      description: (args: Result) =>
        `Max Delay was updated from ` + `${args.oldMaximumDelay} to ${args.newMaximumDelay}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: '57d80797-7221-4757-8b8a-2a593ba16b6b',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event:
        'event ActionsSetQueued(uint256 indexed id, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, bool[] withDelegatecalls, uint256 executionTime)',
      alertId: 'GOV-BRIDGE-ACTION-SET-QUEUED',
      name: 'ℹ️ Base Gov Bridge: Action set queued',
      description: (args: Result) => `Action set ${args.id} was queued`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: '70d4fbdc-30e4-49c0-aee5-c94b208d80bc',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event ActionsSetExecuted(uint256 indexed id, address indexed initiatorExecution, bytes[] returnedData)',
      alertId: 'GOV-BRIDGE-ACTION-SET-EXECUTED',
      name: 'ℹ️ Base Gov Bridge: Action set executed',
      description: (args: Result) => `Action set ${args.id} was executed`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: 'cdbd1924-9d38-4b48-ba12-45271b5c83e9',
    },
    {
      address: GOV_BRIDGE_ADDRESS,
      event: 'event ActionsSetCanceled(uint256 indexed id)',
      alertId: 'GOV-BRIDGE-ACTION-SET-CANCELED',
      name: 'ℹ️ Base Gov Bridge: Action set canceled',
      description: (args: Result) => `Action set ${args.id} was canceled`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: '581ece43-0cdf-44f9-9ee7-fefe00a8f185',
    },
  ]
}
