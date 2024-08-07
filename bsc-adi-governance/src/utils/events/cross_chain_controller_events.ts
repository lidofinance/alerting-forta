import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../types'

export function getCrossChainControllerEvents(crossChainControllerAddress: string): EventOfNotice[] {
  return [
    {
      address: crossChainControllerAddress,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: `🚨🚨🚨 BSC a.DI: Proxy admin changed`,
      description: (args: Result) =>
        `Proxy admin for bnbCrossChainControllerAddress (${crossChainControllerAddress}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: crossChainControllerAddress,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: `🚨🚨🚨 BSC a.DI: Proxy upgraded`,
      description: (args: Result) =>
        `Proxy for bnbCrossChainControllerAddress (${crossChainControllerAddress}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: crossChainControllerAddress,
      event: 'event GuardianUpdated(address oldGuardian, address newGuardian)',
      alertId: 'BSC-ADI-GUARDIAN-UPDATED',
      name: '🚨🚨🚨 BSC a.DI: Guardians updated',
      description: (args: Result) => `Guardian was updated from ` + `${args.oldGuardian} to ${args.newGuardian}`,
      severity: FindingSeverity.Critical,
      type: FindingType.Info,
    },
    {
      address: crossChainControllerAddress,
      event: 'event ConfirmationsUpdated(uint8 newConfirmations, uint256 indexed chainId)',
      alertId: 'BSC-ADI-CONFIRMATIONS-UPDATED',
      name: '🚨 BSC a.DI: Allowed Bridges quorum updated',
      description: (args: Result) => `Allowed bridges quorum updated to ${args.newConfirmations}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
    {
      address: crossChainControllerAddress,
      event:
        'event ReceiverBridgeAdaptersUpdated(address indexed bridgeAdapter, bool indexed allowed, uint256 indexed chainId)',
      alertId: 'BSC-ADI-BRIDGE-SET-UPDATED',
      name: '🚨 BSC a.DI: Allowed bridges set updated',
      description: (args: Result) =>
        `Allowed bridges set updated - ${args.allowed ? 'added' : 'removed'} ${args.bridgeAdapter}`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
    },
  ]
}
