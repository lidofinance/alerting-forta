import { DUAL_GOVERNANCE_ADDRESS } from 'constants/common'
import { Result } from '@ethersproject/abi'
import { FindingSeverity, FindingType } from 'forta-agent'
import { GovernanceState } from '../types'

export const DUAL_GOVERNANCE_STATE_CHANGE_EVENTS = [
  {
    address: DUAL_GOVERNANCE_ADDRESS,
    event:
      'event DualGovernanceStateChanged(uint8 indexed from, uint8 indexed to, (uint8 state, uint40 enteredAt, uint40 vetoSignallingActivatedAt, address signallingEscrow, uint8 rageQuitRound, uint40 vetoSignallingReactivationTime, uint40 normalOrVetoCooldownExitedAt, address rageQuitEscrow, address configProvider) state)',
    alertId: 'DUAL-GOVERNANCE-CONTRACT-STATE-CHANGED',
    name: `🚀 DualGovernance contract: State changed!`,
    description: (args: Result) =>
      `DualGovernance state changed from ${GovernanceState[args.from]} to ${GovernanceState[args.to]}`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: DUAL_GOVERNANCE_ADDRESS,
    event: 'event  NewSignallingEscrowDeployed(address indexed escrow)',
    alertId: 'DUAL-GOVERNANCE-CONTRACT-NEW-ESCROW-DEPLOYED',
    name: `🚀 DualGovernance contract: New Escrow deployed!`,
    description: (args: Result) => `New Escrow with address ${args.escrow} was deployed`,
    severity: FindingSeverity.Info,
    type: FindingType.Info,
  },
]
