import { ProxyContract } from '../constants'
import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export function getProxyAdminEvents(
  LINEA_L2_ERC20_TOKEN_BRIDGE: ProxyContract,
  LINEA_WST_CUSTOM_BRIDGED: ProxyContract,
): EventOfNotice[] {
  const uniqueKeys = [
    'dde14ce0-c978-4e60-9ada-94f8b7938b39',
    '63bb8ae0-09e3-4cd6-968f-a19d553184a6',
    'b5b03919-623f-4f99-b6fa-767d7b199f58',
    '24f0d60c-b4e7-409a-ad87-6bc1508c0365',
    'ec5ed435-4a34-43f1-87b1-c7b7c074f382',
    '622946d1-8cbe-4e7c-a5b0-e005ddadefbe',
  ]

  return [
    {
      address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Linea: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${LINEA_L2_ERC20_TOKEN_BRIDGE.name}(${LINEA_L2_ERC20_TOKEN_BRIDGE.hash}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Linea: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${LINEA_L2_ERC20_TOKEN_BRIDGE.name}(${LINEA_L2_ERC20_TOKEN_BRIDGE.hash}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Linea: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${LINEA_L2_ERC20_TOKEN_BRIDGE.name}(${LINEA_L2_ERC20_TOKEN_BRIDGE.hash}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: LINEA_WST_CUSTOM_BRIDGED.hash,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Linea: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${LINEA_WST_CUSTOM_BRIDGED.name}(${LINEA_WST_CUSTOM_BRIDGED.hash}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: LINEA_WST_CUSTOM_BRIDGED.hash,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Linea: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${LINEA_WST_CUSTOM_BRIDGED.name}(${LINEA_WST_CUSTOM_BRIDGED.hash}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: LINEA_WST_CUSTOM_BRIDGED.hash,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Linea: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${LINEA_WST_CUSTOM_BRIDGED.name}(${LINEA_WST_CUSTOM_BRIDGED.hash}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
  ]
}
