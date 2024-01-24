import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType, LogDescription } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { faker } from '@faker-js/faker'
import { createLogDescriptionMock } from './helper/event_helper'

export function getDepositSecurityEvents(DEPOSIT_SECURITY_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event DepositsPaused(address indexed guardian, uint24 indexed stakingModuleId)',
      alertId: 'LIDO-DEPOSITS-PAUSED',
      name: '🚨 Deposit Security: Deposits paused',
      description: (args: Result) =>
        `Deposits were paused by ${etherscanAddress(args.guardian)} for ${args.stakingModuleId} staking module`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event DepositsUnpaused(uint24 indexed stakingModuleId)',
      alertId: 'LIDO-DEPOSITS-UNPAUSED',
      name: '✅ Deposit Security: Deposits resumed',
      description: (args: Result) => `Deposits were resumed for ${args.stakingModuleId} staking module`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event GuardianAdded(address guardian)',
      alertId: 'LIDO-DEPOSITOR-GUARDIAN-ADDED',
      name: '⚠️ Deposit Security: Guardian added',
      description: (args: Result) => `New guardian added ${etherscanAddress(args.guardian)}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event GuardianRemoved(address guardian)',
      alertId: 'LIDO-DEPOSITOR-GUARDIAN-REMOVED',
      name: '⚠️ Deposit Security: Guardian removed',
      description: (args: Result) => `Guardian ${etherscanAddress(args.guardian)} was removed`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event GuardianQuorumChanged(uint256 newValue)',
      alertId: 'LIDO-DEPOSITOR-GUARDIAN-QUORUM-CHANGED',
      name: '🚨 Deposit Security: Guardian quorum changed',
      description: (args: Result) => `New quorum size ${args.newValue}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event MaxDepositsChanged(uint256 newValue)',
      alertId: 'LIDO-DEPOSITOR-MAX-DEPOSITS-CHANGED',
      name: '⚠️ Deposit Security: Max deposits changed',
      description: (args: Result) => `New value ${args.newValue}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event MinDepositBlockDistanceChanged(uint256 newValue)',
      alertId: 'LIDO-DEPOSITOR-MIN-DEPOSITS-BLOCK-DISTANCE-CHANGED',
      name: '⚠️ Deposit Security: Min deposit block distance changed',
      description: (args: Result) => `New value ${args.newValue}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: DEPOSIT_SECURITY_ADDRESS,
      event: 'event OwnerChanged(address newValue)',
      alertId: 'LIDO-DEPOSITOR-OWNER-CHANGED',
      name: '🚨 Deposit Security: Owner changed',
      description: (args: Result) => `New owner ${etherscanAddress(args.newValue)}`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
  ]
}

export function getFilteredDepositSecurityEventsMock(): LogDescription[] {
  const descriptions = [
    {
      ['guardian']: faker.finance.ethereumAddress(),
      ['stakingModuleId']: 1,
    },
    { ['stakingModuleId']: 1 },
    { ['guardian']: faker.finance.ethereumAddress() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
    { ['newValue']: faker.number.int() },
  ]

  const out: LogDescription[] = []
  for (const desc of descriptions) {
    // eslint-disable-next-line
    // @ts-expect-error
    out.push(createLogDescriptionMock(desc))
  }

  return out
}
