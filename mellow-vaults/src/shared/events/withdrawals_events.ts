import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { VAULT_LIST } from 'constants/common'

export function getProcessAllEvents(DEFAULT_BOND_STRATEGY_ADDRESS: string): EventOfNotice[] {
  const uniqueKeys = ['9d846c64-6858-47c4-afd2-3f3d31da079b']

  const vault = VAULT_LIST.find((vault) => vault.defaultBondStrategy === DEFAULT_BOND_STRATEGY_ADDRESS)
  return [
    {
      address: DEFAULT_BOND_STRATEGY_ADDRESS,
      event: 'event DefaultBondStrategyProcessWithdrawals (address[] users, uint256 timestamp)',
      alertId: 'MELLOW-VAULT-WITHDRAWAL-ALL',
      name: 'ℹ️ Vault: Withdrawal all',
      description: () => {
        return `Mellow Vault [${vault?.name}] (${vault?.vault}) - withdrawal, bond strategy address - ${DEFAULT_BOND_STRATEGY_ADDRESS}`
      },
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
  ]
}

export function getProcessWithdrawalsEvents(DEFAULT_BOND_STRATEGY_ADDRESS: string): EventOfNotice[] {
  const uniqueKeys = ['e27d8c35-bce0-4901-a3d6-ca232cf68ede']

  const vault = VAULT_LIST.find((vault) => vault.defaultBondStrategy === DEFAULT_BOND_STRATEGY_ADDRESS)
  return [
    {
      address: DEFAULT_BOND_STRATEGY_ADDRESS,
      event: 'event DefaultBondStrategyProcessWithdrawals (address[] users, uint256 timestamp)',
      alertId: 'MELLOW-VAULT-PARTIAL-WITHDRAWAL',
      name: '⚠️ Vault: Withdrawal partial',
      description: () => {
        return `Mellow Vault [${vault?.name}] (${vault?.vault}) - bond strategy address - ${DEFAULT_BOND_STRATEGY_ADDRESS}`
      },
      severity: FindingSeverity.Medium,
      type: FindingType.Suspicious,
      uniqueKey: uniqueKeys[0],
    },
  ]
}
