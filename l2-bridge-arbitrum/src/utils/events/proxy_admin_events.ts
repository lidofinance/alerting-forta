import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import FindingType = Finding.FindingType
import { ContractInfo } from '../constants'
import { Result } from '@ethersproject/abi/lib'

export function getProxyAdminEvents(
  ARBITRUM_WSTETH_BRIDGED: ContractInfo,
  ARBITRUM_L2_TOKEN_GATEWAY: ContractInfo,
): EventOfNotice[] {
  return [
    {
      address: ARBITRUM_WSTETH_BRIDGED.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Arbitrum: Proxy ossified',
      description: () =>
        `Proxy for ${ARBITRUM_WSTETH_BRIDGED.name}(${ARBITRUM_WSTETH_BRIDGED.address}) was ossified` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: ARBITRUM_WSTETH_BRIDGED.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Arbitrum: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${ARBITRUM_WSTETH_BRIDGED.name}(${ARBITRUM_WSTETH_BRIDGED.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: Finding.Severity.CRITICAL,
      type: FindingType.INFORMATION,
    },
    {
      address: ARBITRUM_WSTETH_BRIDGED.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Arbitrum: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${ARBITRUM_WSTETH_BRIDGED.name}(${ARBITRUM_WSTETH_BRIDGED.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: Finding.Severity.CRITICAL,
      type: FindingType.INFORMATION,
    },
    {
      address: ARBITRUM_WSTETH_BRIDGED.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Arbitrum: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${ARBITRUM_WSTETH_BRIDGED.name}(${ARBITRUM_WSTETH_BRIDGED.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    //---
    {
      address: ARBITRUM_L2_TOKEN_GATEWAY.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: '🚨 Arbitrum: Proxy ossified',
      description: () =>
        `Proxy for ${ARBITRUM_L2_TOKEN_GATEWAY.name}(${ARBITRUM_L2_TOKEN_GATEWAY.address}) was ossified` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: ARBITRUM_L2_TOKEN_GATEWAY.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: '🚨 Arbitrum: Proxy admin changed',
      description: (args: Result) =>
        `Proxy admin for ${ARBITRUM_L2_TOKEN_GATEWAY.name}(${ARBITRUM_L2_TOKEN_GATEWAY.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: ARBITRUM_L2_TOKEN_GATEWAY.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: '🚨 Arbitrum: Proxy upgraded',
      description: (args: Result) =>
        `Proxy for ${ARBITRUM_L2_TOKEN_GATEWAY.name}(${ARBITRUM_L2_TOKEN_GATEWAY.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: ARBITRUM_L2_TOKEN_GATEWAY.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: '🚨 Arbitrum: Proxy beacon upgraded',
      description: (args: Result) =>
        `Proxy for ${ARBITRUM_L2_TOKEN_GATEWAY.name}(${ARBITRUM_L2_TOKEN_GATEWAY.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
  ]
}
