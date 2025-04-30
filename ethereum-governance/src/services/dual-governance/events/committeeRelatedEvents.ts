import { DUAL_GOVERNANCE_ADDRESS, EMERGENCY_PROTECTED_TIMELOCK_ADDRESS } from 'constants/common'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi'

export const DUAL_GOVERNANCE_COMMITTEE_RELATED_EVENTS = [
  {
    address: EMERGENCY_PROTECTED_TIMELOCK_ADDRESS,
    event: 'event EmergencyModeActivated()',
    alertId: 'EMERGENCY-PROTECTED-TIMELOCK-CONTRACT-EMERGENCY-MODE-ACTIVATED',
    name: `Emergency Mode Activated!`,
    description: () => 'Emergency Mode has been activated!',
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: DUAL_GOVERNANCE_ADDRESS,
    event: 'event TiebreakerCommitteeSet(address newTiebreakerCommittee)',
    alertId: 'DUAL-GOVERNANCE-CONTRACT-TIEBREAKER-COMMITTEE-SET',
    name: `Tiebreaker committee set!`,
    description: (args: Result) => `Tiebreaker committee was set to ${args.newTiebreakerCommittee}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: DUAL_GOVERNANCE_ADDRESS,
    event: 'event ResealCommitteeSet(address resealCommittee)',
    alertId: 'DUAL-GOVERNANCE-CONTRACT-RESEAL-COMMITTEE-SET',
    name: `Reseal committee set!`,
    description: (args: Result) => `Reseal committee was set to  ${args.resealCommittee}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: EMERGENCY_PROTECTED_TIMELOCK_ADDRESS,
    event: 'event EmergencyActivationCommitteeSet(address newActivationCommittee)',
    alertId: 'EMERGENCY-PROTECTED-TIMELOCK-CONTRACT-ACTIVATION-COMMITTEE-SET',
    name: `Activation committee set!`,
    description: (args: Result) => `Activation committee was set to  ${args.newActivationCommittee}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: EMERGENCY_PROTECTED_TIMELOCK_ADDRESS,
    event: 'event EmergencyActivationCommitteeSet(address newExecutionCommittee)',
    alertId: 'EMERGENCY-PROTECTED-TIMELOCK-CONTRACT-EXECUTION-COMMITTEE-SET',
    name: `Execution committee set!`,
    description: (args: Result) => `Execution committee was set to  ${args.newExecutionCommittee}`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
]
