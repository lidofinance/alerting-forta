import { BSC_L1_CROSS_CHAIN_CONTROLLER } from '../constants/cross-chain/mainnet'
import { Result } from '@ethersproject/abi/lib'
import { FindingSeverity, FindingType } from 'forta-agent'
import { EventOfNotice } from '../../entity/events'

export const BSC_L1_CROSS_CHAIN_CONTROLLER_EVENTS: EventOfNotice[] = [
  {
    address: BSC_L1_CROSS_CHAIN_CONTROLLER,
    event: 'event SenderUpdated(address indexed sender, bool indexed isApproved)',
    alertId: 'BSC-ADI-APPROVED-SENDER-UPDATED',
    name: '🚨🚨🚨 BSC a.DI: Approved sender changed',
    description: (args: Result) =>
      args.isApproved
        ? `Address ${args.sender} was set as an approved sender`
        : `Address ${args.sender} was removed from the approved senders list`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: BSC_L1_CROSS_CHAIN_CONTROLLER,
    event: 'event ProxyOssified()',
    alertId: 'PROXY-OSSIFIED',
    name: `🚨 BscCrossChainController: Proxy ossified`,
    description: () =>
      `Proxy for BscCrossChainController(${BSC_L1_CROSS_CHAIN_CONTROLLER}) was ossified` + `\n(detected by event)`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
  {
    address: BSC_L1_CROSS_CHAIN_CONTROLLER,
    event: 'event AdminChanged(address previousAdmin, address newAdmin)',
    alertId: 'PROXY-ADMIN-CHANGED',
    name: `🚨🚨🚨 BscCrossChainController: Proxy admin changed`,
    description: (args: Result) =>
      `Proxy admin for BscCrossChainController(${BSC_L1_CROSS_CHAIN_CONTROLLER}) ` +
      `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
      `\n(detected by event)`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: BSC_L1_CROSS_CHAIN_CONTROLLER,
    event: 'event Upgraded(address indexed implementation)',
    alertId: 'PROXY-UPGRADED',
    name: `🚨🚨🚨 BscCrossChainController: Proxy upgraded`,
    description: (args: Result) =>
      `Proxy for BscCrossChainController(${BSC_L1_CROSS_CHAIN_CONTROLLER}) ` +
      `was updated to ${args.implementation}` +
      `\n(detected by event)`,
    severity: FindingSeverity.Critical,
    type: FindingType.Info,
  },
  {
    address: BSC_L1_CROSS_CHAIN_CONTROLLER,
    event: 'event BeaconUpgraded(address indexed beacon)',
    alertId: 'PROXY-BEACON-UPGRADED',
    name: `🚨 BscCrossChainController: Proxy beacon upgraded`,
    description: (args: Result) =>
      `Proxy for BscCrossChainController(${BSC_L1_CROSS_CHAIN_CONTROLLER}) ` +
      `beacon was updated to ${args.beacon}` +
      `\n(detected by event)`,
    severity: FindingSeverity.High,
    type: FindingType.Info,
  },
]
