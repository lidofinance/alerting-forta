import { ContractInfo } from '../constants'
import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export function getProxyAdminEvents(l2WstethContract: ContractInfo, l2GatewayContract: ContractInfo): EventOfNotice[] {
  return [
    {
      address: l2WstethContract.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Scroll: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${l2WstethContract.name}(${l2WstethContract.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '18BA44FB-E5AC-4F7D-A556-3B49D9381B0C',
    },
    {
      address: l2WstethContract.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Scroll: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${l2WstethContract.name}(${l2WstethContract.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '6D0FC28D-0D3E-41D3-8F9A-2A52AFDA7543',
    },
    {
      address: l2WstethContract.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Scroll: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${l2WstethContract.name}(${l2WstethContract.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: '913345D0-B591-4699-9E5B-384C2640A9C3',
    },
    {
      address: l2GatewayContract.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Scroll: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${l2GatewayContract.name}(${l2GatewayContract.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'DE3F6E46-984B-435F-B88C-E5198386CCF6',
    },
    {
      address: l2GatewayContract.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Scroll: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${l2GatewayContract.name}(${l2GatewayContract.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'CFA25A7F-69C4-45BE-8CAE-884EE8FEF5CA',
    },
    {
      address: l2GatewayContract.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Scroll: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${l2GatewayContract.name}(${l2GatewayContract.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: 'B7193990-458E-4F41-ADD9-82848D235F5B',
    },
  ]
}
