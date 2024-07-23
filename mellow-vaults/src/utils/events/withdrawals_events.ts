import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import type { EventOfNotice } from '../../entity/events'
import { getVaultByAddress } from '../../shared/vault'

export const MELLOW_VAULT_PROCESS_WITHDRAWALS_EVENT =
  'event DefaultBondStrategyProcessWithdrawals (address[] users, uint256 timestamp)'

export const processWithdrawalsAllNotices: Record<string, EventOfNotice> = {
  DefaultBondStrategyProcessWithdrawals: {
    event: MELLOW_VAULT_PROCESS_WITHDRAWALS_EVENT,
    alertId: 'MELLOW-VAULT-WITHDRAWAL-ALL',
    name: 'ℹ️ Vault: Withdrawal all',
    description: (_: Result, address: string) => {
      const vault = getVaultByAddress(address)
      return `Mellow Vault [${vault?.name}] (${vault?.vault}) - withdrawal, bond strategy address - ${address}`
    },
    severity: FindingSeverity.Info,
    type: FindingType.Info,
    uniqueKey: '9d846c64-6858-47c4-afd2-3f3d31da079b',
  },
}

export const processWithdrawalsPartNotices: Record<string, EventOfNotice> = {
  DefaultBondStrategyProcessWithdrawals: {
    event: MELLOW_VAULT_PROCESS_WITHDRAWALS_EVENT,
    alertId: 'MELLOW-VAULT-PARTIAL-WITHDRAWAL',
    name: '⚠️ Vault: Withdrawal partial',
    description: (_: Result, address: string) => {
      const vault = getVaultByAddress(address)
      return `Mellow Vault [${vault?.name}] (${vault?.vault}) - bond strategy address - ${address}`
    },
    severity: FindingSeverity.Medium,
    type: FindingType.Suspicious,
    uniqueKey: 'e27d8c35-bce0-4901-a3d6-ca232cf68ede',
  },
}
