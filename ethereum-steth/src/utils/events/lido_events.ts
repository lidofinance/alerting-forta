import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { etherscanAddress } from '../string'

export const alertId_token_rebased = 'LIDO-TOKEN-REBASED'

export function getLidoEvents(LIDO_STETH_ADDRESS: string): EventOfNotice[] {
  return [
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event Stopped()',
      alertId: 'LIDO-STOPPED',
      name: '🚨🚨🚨 Lido: Stopped 🚨🚨🚨',
      description: () => `Lido DAO contract was stopped`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event StakingLimitRemoved()',
      alertId: 'LIDO-STAKING-LIMIT-REMOVED',
      name: '🚨 Lido: Staking limit removed',
      description: () => `Staking limit was removed`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event LidoLocatorSet(address lidoLocator)',
      alertId: 'LIDO-LOCATOR-SET',
      name: '🚨 Lido: Locator set',
      description: (args: Result) => `Lido locator was set to: ${etherscanAddress(args.lidoLocator)}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event StakingPaused()',
      alertId: 'LIDO-STAKING-PAUSED',
      name: '🚨 Lido: Staking paused',
      description: () => `Staking was paused!`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event Resumed()',
      alertId: 'LIDO-RESUMED',
      name: '⚠️ Lido: Resumed',
      description: () => `Lido DAO contract was resumed`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event StakingResumed()',
      alertId: 'LIDO-STAKING-RESUMED',
      name: '⚠️ Lido: Staking resumed',
      description: () => `Staking was resumed!`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event StakingLimitSet(uint256 maxStakeLimit, uint256 stakeLimitIncreasePerBlock)',
      alertId: 'LIDO-STAKING-LIMIT-SET',
      name: '⚠️ Lido: Staking limit set',
      description: (args: Result) =>
        `Staking limit was set with:\n` +
        `Max staking limit: ${args.maxStakeLimit}\n` +
        `Stake limit increase per block: ${args.stakeLimitIncreasePerBlock}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event RecoverToVault(address vault, address token, uint256 amount)',
      alertId: 'LIDO-RECOVER-TO-VAULT',
      name: '⚠️ Lido: Funds recovered to vault',
      description: (args: Result) =>
        `Funds recovered to vault:\n` +
        `Vault: ${etherscanAddress(args.vault)}\n` +
        `Token: ${etherscanAddress(args.token)}\n` +
        `Amount: ${args.amount}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event ContractVersionSet(uint256 version)',
      alertId: 'LIDO-CONTRACT-VERSION-SET',
      name: '⚠️ Lido: Contract version set',
      description: (args: Result) => `Contract version set:\n` + `Version: ${args.version}`,
      severity: Finding.Severity.MEDIUM,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: LIDO_STETH_ADDRESS,
      abi: 'event TokenRebased(uint256 indexed reportTimestamp, uint256 timeElapsed, uint256 preTotalShares, uint256 preTotalEther, uint256 postTotalShares, uint256 postTotalEther, uint256 sharesMintedAsFees)',
      alertId: alertId_token_rebased,
      name: 'ℹ️ Lido: Token rebased',
      description: (args: Result) => `reportTimestamp: ${args.reportTimestamp}`,
      severity: Finding.Severity.INFO,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
