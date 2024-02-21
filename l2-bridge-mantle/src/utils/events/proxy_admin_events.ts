import { L2_ERC20_TOKEN_GATEWAY_TYPE, MANTLE_WST_ETH_BRIDGED_TYPE } from '../constants'
import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export function getProxyAdminEvents(
  MANTLE_WST_ETH_BRIDGED_ADDRESS: MANTLE_WST_ETH_BRIDGED_TYPE,
  L2_ERC20_TOKEN_GATEWAY_ADDRESS: L2_ERC20_TOKEN_GATEWAY_TYPE,
): EventOfNotice[] {
  const uniqueKeys = [
    '82b39d98-a156-4be2-be48-81a0d237c53a',
    '44367f0e-dbe2-4cb0-b256-1af2c9a38d9f',
    '85bcbe60-df81-46ec-b54a-4f667f6a238d',
    'e719527e-99ee-4345-aa6f-c815d7d4a1b1',
    'e449ed63-f96b-4df8-96a2-f6643e4bc679',
    'cef80661-e44b-47d4-8682-a78d41316953',
    '525a056c-6099-4c02-8fdb-e9ced4a17fbb',
    'e926bca1-8446-4ef7-b610-43748b3fcc91',
  ]

  return [
    {
      address: MANTLE_WST_ETH_BRIDGED_ADDRESS.hash,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Mantle: Proxy ossified',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      description: (args: Result) =>
        `Proxy for ${MANTLE_WST_ETH_BRIDGED_ADDRESS.name}(${MANTLE_WST_ETH_BRIDGED_ADDRESS.hash}) was ossified` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: MANTLE_WST_ETH_BRIDGED_ADDRESS.hash,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Mantle: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${MANTLE_WST_ETH_BRIDGED_ADDRESS.name}(${MANTLE_WST_ETH_BRIDGED_ADDRESS.hash}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: MANTLE_WST_ETH_BRIDGED_ADDRESS.hash,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Mantle: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${MANTLE_WST_ETH_BRIDGED_ADDRESS.name}(${MANTLE_WST_ETH_BRIDGED_ADDRESS.hash}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: MANTLE_WST_ETH_BRIDGED_ADDRESS.hash,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Mantle: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${MANTLE_WST_ETH_BRIDGED_ADDRESS.name}(${MANTLE_WST_ETH_BRIDGED_ADDRESS.hash}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },

    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Mantle: Proxy ossified',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      description: (args: Result) =>
        `Proxy for ${L2_ERC20_TOKEN_GATEWAY_ADDRESS.name}(${L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash}) was ossified` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Mantle: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${L2_ERC20_TOKEN_GATEWAY_ADDRESS.name}(${L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Mantle: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${L2_ERC20_TOKEN_GATEWAY_ADDRESS.name}(${L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Mantle: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${L2_ERC20_TOKEN_GATEWAY_ADDRESS.name}(${L2_ERC20_TOKEN_GATEWAY_ADDRESS.hash}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
  ]
}
