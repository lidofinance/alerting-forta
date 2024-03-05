import { OProxyContract } from '../constants'
import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

export function getProxyAdminEvents(
  L2ERC20_Token_Gateway: OProxyContract,
  BASE_WST_ETH_BRIDGED: OProxyContract,
): EventOfNotice[] {
  const uniqueKeys = [
    'add047d4-ad28-47c9-9543-55e20c55f182',
    '1a79879e-12eb-4749-917e-cd8163bbc136',
    'b272e522-55af-46a6-8c10-16e9538c10b2',
    '3c806ac9-e51d-4d11-9f5c-03346d3bf9c0',
    '858282d8-2039-4a5a-8894-19854991773e',
    'cb522da7-f0ab-460e-bc10-eb1c6d0938b8',
    '3fe4f5de-1773-4ae9-9254-eb93f7682046',
    '1b1c492f-6d2b-4cc7-a9b0-1db92307d508',
  ]

  return [
    {
      address: L2ERC20_Token_Gateway.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Base: Proxy ossified',
      description: () =>
        `Proxy for ${L2ERC20_Token_Gateway.name}(${L2ERC20_Token_Gateway.address}) was ossified` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[0],
    },
    {
      address: L2ERC20_Token_Gateway.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Base: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${L2ERC20_Token_Gateway.name}(${L2ERC20_Token_Gateway.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[1],
    },
    {
      address: L2ERC20_Token_Gateway.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Base: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${L2ERC20_Token_Gateway.name}(${L2ERC20_Token_Gateway.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[2],
    },
    {
      address: L2ERC20_Token_Gateway.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Base: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${L2ERC20_Token_Gateway.name}(${L2ERC20_Token_Gateway.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[3],
    },
    {
      address: BASE_WST_ETH_BRIDGED.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Base: Proxy ossified',
      description: () =>
        `Proxy for ${BASE_WST_ETH_BRIDGED.name}(${BASE_WST_ETH_BRIDGED.address}) was ossified` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[4],
    },
    {
      address: BASE_WST_ETH_BRIDGED.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Base: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${BASE_WST_ETH_BRIDGED.name}(${BASE_WST_ETH_BRIDGED.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[5],
    },
    {
      address: BASE_WST_ETH_BRIDGED.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Base: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${BASE_WST_ETH_BRIDGED.name}(${BASE_WST_ETH_BRIDGED.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[6],
    },
    {
      address: BASE_WST_ETH_BRIDGED.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Base: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${BASE_WST_ETH_BRIDGED.name}(${BASE_WST_ETH_BRIDGED.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: FindingSeverity.High,
      type: FindingType.Info,
      uniqueKey: uniqueKeys[7],
    },
  ]
}
