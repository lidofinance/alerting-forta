import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export const MELLOW_VAULT_INCREASE_LIMIT_EVENT = 'event IncreaseLimit(uint256 amount)'

export const vaultLimitNotice = {
  IncreaseLimit: {
    event: MELLOW_VAULT_INCREASE_LIMIT_EVENT,
    alertId: 'MELLOW-SYMBIOTIC-INCREASE-LIMIT',
    name: '⚠️ Vault: Symbiotic limit increased',
    description: (args: Result) => `Symbiotic limit increased to ${args.amount}`,
    severity: FindingSeverity.Medium,
    type: FindingType.Info,
    uniqueKey: '27c9ac49-4c5f-4d3e-9a4a-0d61e21965b2 ',
  },
}
