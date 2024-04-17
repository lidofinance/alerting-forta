import { ZKSYNC_WSTETH_BRIDGED_UPGRADEABLE_TYPE, ZKSYNC_BRIDGE_EXECUTOR_TYPE } from '../constants'
import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export function getProxyAdminEvents(
  ZKSYNC_WSTETH_BRIDGED: ZKSYNC_WSTETH_BRIDGED_UPGRADEABLE_TYPE,
  ZKSYNC_BRIDGE_EXECUTOR: ZKSYNC_BRIDGE_EXECUTOR_TYPE,
): EventOfNotice[] {
  const uniqueKeys = [
    'f9e87d52-9ac5-4f26-8dbb-a2f56c5f06bb',
    '44e4e424-f0ca-41dc-96db-26615f048126',
    'd02105a0-a7e7-4347-84dc-d3a67a632b33',
    'c3dff9f7-0b43-400d-a7aa-c081a9c6291d',
    'b950d684-7b89-4cde-af08-f2906d3b0ac9',
    'ca7d2108-fece-41fd-a262-e6959442fb48',
    '200859ec-c205-44b3-ab55-2939b77a5c05',
    '70377bd2-5047-42a2-9afa-e7222096808e',
  ]

  return [
    {
      address: ZKSYNC_WSTETH_BRIDGED.proxyAddress,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 ZkSync: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${ZKSYNC_WSTETH_BRIDGED.name}(${ZKSYNC_WSTETH_BRIDGED.proxyAdminAddress}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: ZKSYNC_WSTETH_BRIDGED.proxyAddress,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 ZkSync: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${ZKSYNC_WSTETH_BRIDGED.name}(${ZKSYNC_WSTETH_BRIDGED.proxyAdminAddress}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: ZKSYNC_WSTETH_BRIDGED.proxyAddress,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 ZkSync: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${ZKSYNC_WSTETH_BRIDGED.name}(${ZKSYNC_WSTETH_BRIDGED.proxyAdminAddress}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: ZKSYNC_WSTETH_BRIDGED.proxyAddress,
      event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
      alertId: 'PROXY-OWNER-TRANSFERRED',
      name: '🚨 ZkSync: Proxy owner transferred',
      description: (args: Result) =>
        `Proxy owner for ${ZKSYNC_WSTETH_BRIDGED.name}(${ZKSYNC_WSTETH_BRIDGED.proxyAdminAddress}) ` +
        `was changed to ${args.newOwner}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: ZKSYNC_BRIDGE_EXECUTOR.proxyAddress,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 ZkSync: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${ZKSYNC_BRIDGE_EXECUTOR.name}(${ZKSYNC_BRIDGE_EXECUTOR.proxyAdminAddress}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: ZKSYNC_BRIDGE_EXECUTOR.proxyAddress,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 ZkSync: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${ZKSYNC_BRIDGE_EXECUTOR.name}(${ZKSYNC_BRIDGE_EXECUTOR.proxyAdminAddress}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: ZKSYNC_BRIDGE_EXECUTOR.proxyAddress,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 ZkSync: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${ZKSYNC_BRIDGE_EXECUTOR.name}(${ZKSYNC_BRIDGE_EXECUTOR.proxyAdminAddress}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: ZKSYNC_BRIDGE_EXECUTOR.proxyAddress,
      event: 'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
      alertId: 'PROXY-OWNER-TRANSFERRED',
      name: '🚨 ZkSync: Proxy owner transferred',
      description: (args: Result) =>
        `Proxy owner for ${ZKSYNC_BRIDGE_EXECUTOR.name}(${ZKSYNC_BRIDGE_EXECUTOR.proxyAdminAddress}) ` +
        `was changed to ${args.newOwner}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
  ]
}
