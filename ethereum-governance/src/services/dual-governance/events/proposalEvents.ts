import { DUAL_GOVERNANCE_ADDRESS, EMERGENCY_PROTECTED_TIMELOCK_ADDRESS } from 'constants/common'
import { Result } from '@ethersproject/abi'
import { FindingSeverity, FindingType } from 'forta-agent'

export const DUAL_GOVERNANCE_PROPOSAL_STATUS_EVENTS = [
  {
    address: DUAL_GOVERNANCE_ADDRESS,
    event: 'event ProposalSubmitted(address indexed proposerAccount, uint256 indexed proposalId, string metadata)',
    alertId: 'DUAL-GOVERNANCE-CONTRACT-PROPOSAL-SUBMITTED',
    name: '🚀 DualGovernance contract: Proposal Submitted',
    description: (args: Result) => `Proposal #${args.proposalId} was submitted to Dual Governance`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: EMERGENCY_PROTECTED_TIMELOCK_ADDRESS,
    event: 'event ProposalScheduled(uint256 indexed id)',
    alertId: 'EMERGENCY-PROTECTED-TIMELOCK-CONTRACT-PROPOSAL-SCHEDULED',
    name: '🚀 EmergencyProtectedTimelock contract: Proposal scheduled',
    description: (args: Result) => `Proposal #${args.id} has been scheduled`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: EMERGENCY_PROTECTED_TIMELOCK_ADDRESS,
    event: 'event ProposalExecuted(uint256 indexed id)',
    alertId: 'EMERGENCY-PROTECTED-TIMELOCK-CONTRACT-PROPOSAL-EXECUTED',
    name: '🚀 EmergencyProtectedTimelock contract: Proposal executed',
    description: (args: Result) => `Proposal #${args.id} has been executed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
  {
    address: EMERGENCY_PROTECTED_TIMELOCK_ADDRESS,
    event: 'event ProposalsCancelledTill(uint256 proposalId)',
    alertId: 'EMERGENCY-PROTECTED-TIMELOCK-CONTRACT-PROPOSAL-CANCELLED',
    name: '🚀 EmergencyProtectedTimelock contract: Proposal cancelled',
    description: (args: Result) => `Proposal #${args.proposalId} has been cancelled`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
]
