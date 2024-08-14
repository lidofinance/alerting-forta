import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { etherscanAddress } from '../string'

export function getDepositSecurityEvents(DEPOSIT_SECURITY_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event DepositsPaused(address indexed guardian, uint24 indexed stakingModuleId)',
      alertId: 'LIDO-DEPOSITS-PAUSED',
      name: '🚨 Deposit Security: Deposits paused',
      description: (args: Result) =>
        `Deposits were paused by ${etherscanAddress(args.guardian)} for ${args.stakingModuleId} staking module`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event GuardianQuorumChanged(uint256 newValue)',
      alertId: 'LIDO-DEPOSITOR-GUARDIAN-QUORUM-CHANGED',
      name: '🚨 Deposit Security: Guardian quorum changed',
      description: (args: Result) => `New quorum size ${args.newValue}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event OwnerChanged(address newValue)',
      alertId: 'LIDO-DEPOSITOR-OWNER-CHANGED',
      name: '🚨 Deposit Security: Owner changed',
      description: (args: Result) => `New owner ${etherscanAddress(args.newValue)}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event DepositsUnpaused(uint24 indexed stakingModuleId)',
      alertId: 'LIDO-DEPOSITS-UNPAUSED',
      name: '⚠️ Deposit Security: Deposits resumed',
      description: (args: Result) => `Deposits were resumed for ${args.stakingModuleId} staking module`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event GuardianAdded(address guardian)',
      alertId: 'LIDO-DEPOSITOR-GUARDIAN-ADDED',
      name: '⚠️ Deposit Security: Guardian added',
      description: (args: Result) => `New guardian added ${etherscanAddress(args.guardian)}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event GuardianRemoved(address guardian)',
      alertId: 'LIDO-DEPOSITOR-GUARDIAN-REMOVED',
      name: '⚠️ Deposit Security: Guardian removed',
      description: (args: Result) => `Guardian ${etherscanAddress(args.guardian)} was removed`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event MaxDepositsChanged(uint256 newValue)',
      alertId: 'LIDO-DEPOSITOR-MAX-DEPOSITS-CHANGED',
      name: '⚠️ Deposit Security: Max deposits changed',
      description: (args: Result) => `New value ${args.newValue}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      abi: 'event MinDepositBlockDistanceChanged(uint256 newValue)',
      alertId: 'LIDO-DEPOSITOR-MIN-DEPOSITS-BLOCK-DISTANCE-CHANGED',
      name: '⚠️ Deposit Security: Min deposit block distance changed',
      description: (args: Result) => `New value ${args.newValue}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
