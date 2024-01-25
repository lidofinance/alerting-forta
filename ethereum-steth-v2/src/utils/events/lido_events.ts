import { FindingSeverity, FindingType, LogDescription } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { faker } from '@faker-js/faker'
import { createLogDescriptionMock } from '../contract_mocks/log_description.mock'

export const alertId_token_rebased = 'LIDO-TOKEN-REBASED'

export function getLidoEvents(LIDO_STETH_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event Stopped()',
      alertId: 'LIDO-STOPPED',
      name: '🚨🚨🚨 Lido: Stopped 🚨🚨🚨',
      description: () => `Lido DAO contract was stopped`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event Resumed()',
      alertId: 'LIDO-RESUMED',
      name: '⚠️ Lido: Resumed',
      description: () => `Lido DAO contract was resumed`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event StakingPaused()',
      alertId: 'LIDO-STAKING-PAUSED',
      name: '🚨 Lido: Staking paused',
      description: () => `Staking was paused!`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event StakingResumed()',
      alertId: 'LIDO-STAKING-RESUMED',
      name: '⚠️ Lido: Staking resumed',
      description: () => `Staking was resumed!`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event StakingLimitSet(uint256 maxStakeLimit, uint256 stakeLimitIncreasePerBlock)',
      alertId: 'LIDO-STAKING-LIMIT-SET',
      name: '⚠️ Lido: Staking limit set',
      description: (args: Result) =>
        `Staking limit was set with:\n` +
        `Max staking limit: ${args.maxStakeLimit}\n` +
        `Stake limit increase per block: ${args.stakeLimitIncreasePerBlock}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event StakingLimitRemoved()',
      alertId: 'LIDO-STAKING-LIMIT-REMOVED',
      name: '🚨 Lido: Staking limit removed',
      description: () => `Staking limit was removed`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event LidoLocatorSet(address lidoLocator)',
      alertId: 'LIDO-LOCATOR-SET',
      name: '🚨 Lido: Locator set',
      description: (args: Result) => `Lido locator was set to: ${etherscanAddress(args.lidoLocator)}`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event RecoverToVault(address vault, address token, uint256 amount)',
      alertId: 'LIDO-RECOVER-TO-VAULT',
      name: '⚠️ Lido: Funds recovered to vault',
      description: (args: Result) =>
        `Funds recovered to vault:\n` +
        `Vault: ${etherscanAddress(args.vault)}\n` +
        `Token: ${etherscanAddress(args.token)}\n` +
        `Amount: ${args.amount}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event: 'event ContractVersionSet(uint256 version)',
      alertId: 'LIDO-CONTRACT-VERSION-SET',
      name: '⚠️ Lido: Contract version set',
      description: (args: Result) => `Contract version set:\n` + `Version: ${args.version}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
    {
      address: LIDO_STETH_ADDRESS,
      event:
        'event TokenRebased(uint256 indexed reportTimestamp, uint256 timeElapsed, uint256 preTotalShares, uint256 preTotalEther, uint256 postTotalShares, uint256 postTotalEther, uint256 sharesMintedAsFees)',
      alertId: alertId_token_rebased,
      name: '⚠️ Lido: Token rebased',
      description: (args: Result) => `reportTimestamp: ${args.reportTimestamp}`,
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    },
  ]
}
export function getFilteredLidoEventsMock(): LogDescription[] {
  const descriptions = [
    {},
    {},
    {},
    {},
    {
      ['maxStakeLimit']: faker.number.int(),
      ['stakeLimitIncreasePerBlock']: faker.number.int(),
    },
    {},
    {
      ['lidoLocator']: faker.finance.ethereumAddress(),
    },
    {
      ['vault']: faker.finance.ethereumAddress(),
      ['token']: faker.finance.ethereumAddress(),
    },
    {
      ['version']: faker.system.semver(),
    },
    {
      ['amount']: faker.number.int(),
    },
  ]

  const out: LogDescription[] = []
  for (const desc of descriptions) {
    // eslint-disable-next-line
    // @ts-expect-error
    out.push(createLogDescriptionMock(desc))
  }

  return out
}
