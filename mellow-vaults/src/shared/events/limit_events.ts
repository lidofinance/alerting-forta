import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { MELLOW_SYMBIOTIC_ADDRESS } from 'constants/common'

export function getLimitEvents(): EventOfNotice[] {
  const uniqueKeys = ['27c9ac49-4c5f-4d3e-9a4a-0d61e21965b2 ']

  return [
    {
      address: MELLOW_SYMBIOTIC_ADDRESS,
      event: 'event IncreaseLimit(uint256 amount)',
      alertId: 'MELLOW-SYMBIOTIC-INCREASE-LIMIT',
      name: '⚠️ Vault: Symbiotic limit increased',
      description: (args: Result) => `Symbiotic limit increased to ${args.amount}`,
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
  ]
}
