import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'

export function getProcessAllEvents(DEFAULT_BOND_STRATEGY_ADDRESS: string): EventOfNotice[] {
  const uniqueKeys = ['9d846c64-6858-47c4-afd2-3f3d31da079b']

  return [
    {
      address: DEFAULT_BOND_STRATEGY_ADDRESS,
      event: 'event DefaultBondStrategyProcessWithdrawals (address[] users, uint256 timestamp)',
      alertId: 'MELLOW-VAULT-WITHDRAWAL-ALL',
      name: 'ℹ️ Vault: Withdrawal all',
      description: () => {
        return `Vault withdrawal, bond strategy address - ${DEFAULT_BOND_STRATEGY_ADDRESS}`
      },
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
  ]
}

export function getProcessWithdrawalsEvents(DEFAULT_BOND_STRATEGY_ADDRESS: string): EventOfNotice[] {
  const uniqueKeys = ['e27d8c35-bce0-4901-a3d6-ca232cf68ede']

  return [
    {
      address: DEFAULT_BOND_STRATEGY_ADDRESS,
      event: 'event DefaultBondStrategyProcessWithdrawals (address[] users, uint256 timestamp)',
      alertId: 'MELLOW-VAULT-PARTIAL-WITHDRAWAL',
      name: '⚠️ Vault: Withdrawal partial',
      description: () => {
        return `Vault withdrawal, bond strategy address - ${DEFAULT_BOND_STRATEGY_ADDRESS}`
      },
      severity: FindingSeverity.Medium,
      type: FindingType.Suspicious,
      uniqueKey: uniqueKeys[0],
    },
  ]
}
