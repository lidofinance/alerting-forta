import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../types'

export function getCrossChainControllerEvents(crossChainControllerAddress: string): EventOfNotice[] {
  return [
    {
      address: crossChainControllerAddress,
      event: 'event ConfirmationsUpdated(uint8 newConfirmations, uint256 indexed chainId)',
      alertId: 'BSC-ADI-CONFIRMATIONS-UPDATED',
      name: '🚨 BSC a.DI: Allowed Bridges quorum updated',
      description: (args: Result) => `Allowed bridges quorum updated to ${args.newConfirmations}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
  ]
}
