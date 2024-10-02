import { FindingSeverity, FindingType, ethers } from '@fortanetwork/forta-bot'

import { CSModule__factory } from '../../../generated/typechain'
import { EventOfNotice } from '../../../shared/types'
import { formatEther } from '../../../utils/string'

const ICSModule = CSModule__factory.createInterface()

export function getCSModuleEvents(csmAddress: string): EventOfNotice[] {
  return [
    {
      address: csmAddress,
      abi: ICSModule.getEvent('PublicRelease').format('full'),
      alertId: 'CS-MODULE-PUBLIC-RELEASE',
      name: '🔵 CSModule: Public release',
      description: () => 'CSM public release is activated! 🥳',
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
    {
      address: csmAddress,
      abi: ICSModule.getEvent('VettedSigningKeysCountDecreased').format('full'),
      alertId: 'CS-MODULE-VETTED-SIGNING-KEYS-DECREASED',
      name: '🔵 CSModule: Node Operator vetted signing keys decreased',
      description: (args: ethers.Result) => `Vetted signing keys decreased for Node Operator #${args.nodeOperatorId}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: csmAddress,
      abi: ICSModule.getEvent('TargetValidatorsCountChanged').format('full'),
      alertId: 'CS-MODULE-TARGET-LIMIT-MODE-CHANGED',
      name: '🟠 CSModule: Target limit mode changed',
      description: (args: ethers.Result) =>
        `Target limit mode: ${args.targetLimitMode} (${
          args.targetLimitMode === 0n ? 'disabled' : args.targetLimitMode === 1n ? 'soft' : 'forced'
        }) set for Node Operator ${args.nodeOperatorId}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    },
    {
      address: csmAddress,
      abi: ICSModule.getEvent('ELRewardsStealingPenaltyReported').format('full'),
      alertId: 'CS-MODULE-EL-REWARDS-STEALING-PENALTY-REPORTED',
      name: '🔴 CSModule: EL Rewards stealing penalty reported',
      description: (args: ethers.Result) =>
        `EL Rewards stealing penalty reported for Node Operator #${args.nodeOperatorId} with ${formatEther(args.stolenAmount)} potentially stolen`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: csmAddress,
      abi: ICSModule.getEvent('ELRewardsStealingPenaltyCancelled').format('full'),
      alertId: 'CS-MODULE-EL-REWARDS-STEALING-PENALTY-CANCELLED',
      name: '🔴 CSModule: EL Rewards stealing penalty cancelled',
      description: (args: ethers.Result) =>
        `EL Rewards stealing penalty (${formatEther(args.amount)}) cancelled for Node Operator #${args.nodeOperatorId}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: csmAddress,
      abi: ICSModule.getEvent('ELRewardsStealingPenaltySettled').format('full'),
      alertId: 'CS-MODULE-EL-REWARDS-STEALING-PENALTY-SETTLED',
      name: '🔴 CSModule: EL Rewards stealing penalty settled',
      description: (args: ethers.Result) =>
        `EL Rewards stealing penalty settled for Node Operator #${args.nodeOperatorId}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: csmAddress,
      abi: ICSModule.getEvent('ELRewardsStealingPenaltyCompensated').format('full'),
      alertId: 'CS-MODULE-EL-REWARDS-STEALING-PENALTY-COMPENSATED',
      name: '🔴 CSModule: EL Rewards stealing penalty compensated',
      description: (args: ethers.Result) =>
        `${formatEther(args.stolenAmount)} of EL Rewards stealing penalty was compensated for Node Operator #${args.nodeOperatorId}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
  ]
}
