import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { Finding } from '../../generated/proto/alert_pb'
import { toEthString } from '../string'
import BigNumber from 'bignumber.js'

export function getCSModuleEvents(CS_MODULE_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: CS_MODULE_ADDRESS,
      abi: 'event PublicRelease()',
      alertId: 'CS-MODULE-PUBLIC-RELEASE',
      name: '🔵 CSModule: Public release',
      description: () => `Public release is activated on ${CS_MODULE_ADDRESS}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_MODULE_ADDRESS,
      abi: 'event VettedSigningKeysCountDecreased(uint256 indexed nodeOperatorId)',
      alertId: 'CS-MODULE-VETTED-SIGNING-KEYS-DECREASED',
      name: '🔵 CSModule: Node Operator vetted signing keys decreased',
      description: (args: Result) => `Vetted signing keys decreased for Node Operator #${args.nodeOperatorId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_MODULE_ADDRESS,
      abi: 'event TargetValidatorsCountChanged(uint256 indexed nodeOperatorId, uint256 targetLimitMode, uint256 targetValidatorsCount)',
      alertId: 'CS-MODULE-TARGET-LIMIT-MODE-CHANGED',
      name: '🟠 CSModule: Target limit mode changed',
      description: (args: Result) =>
        `Target limit mode: ${args.targetLimitMode} (${Number(args.targetLimitMode) === 1 ? 'soft mode' : 'forced mode'})`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_MODULE_ADDRESS,
      abi: 'event ELRewardsStealingPenaltyReported(uint256 indexed nodeOperatorId, bytes32 proposedBlockHash, uint256 stolenAmount)',
      alertId: 'CS-MODULE-EL-REWARDS-STEALING-PENALTY-REPORTED',
      name: '🔴 CSModule: EL Rewards stealing penalty reported',
      description: (args: Result) =>
        `EL Rewards stealing penalty reported for Node Operator #${args.nodeOperatorId} with ${toEthString(BigNumber(Number(args.stolenAmount)))} potentially stolen`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_MODULE_ADDRESS,
      abi: 'event ELRewardsStealingPenaltyCancelled(uint256 indexed nodeOperatorId, uint256 amount)',
      alertId: 'CS-MODULE-EL-REWARDS-STEALING-PENALTY-CANCELLED',
      name: '🔴 CSModule: EL Rewards stealing penalty cancelled',
      description: (args: Result) =>
        `EL Rewards stealing penalty (${toEthString(args.amount)}) cancelled for Node Operator #${args.nodeOperatorId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: CS_MODULE_ADDRESS,
      abi: 'event ELRewardsStealingPenaltySettled(uint256 indexed nodeOperatorId)',
      alertId: 'CS-MODULE-EL-REWARDS-STEALING-PENALTY-SETTLED',
      name: '🔴 CSModule: EL Rewards stealing penalty settled',
      description: (args: Result) => `EL Rewards stealing penalty settled for Node Operator #${args.nodeOperatorId}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
