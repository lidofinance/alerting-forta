import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import FindingType = Finding.FindingType
import { ContractInfo } from '../constants'
import { Result } from '@ethersproject/abi/lib'

export function getProxyAdminEvents(
  l2WstethBridged: ContractInfo,
  l2TokenGateway: ContractInfo,
  networkName: string,
): EventOfNotice[] {
  return [
    {
      address: l2WstethBridged.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: `🚨 ${networkName}: Proxy ossified`,
      description: () =>
        `Proxy for ${l2WstethBridged.name}(${l2WstethBridged.address}) was ossified` + `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: l2WstethBridged.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: `🚨 ${networkName}: Proxy admin changed`,
      description: (args: Result) =>
        `Proxy admin for ${l2WstethBridged.name}(${l2WstethBridged.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: Finding.Severity.CRITICAL,
      type: FindingType.INFORMATION,
    },
    {
      address: l2WstethBridged.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: `🚨 ${networkName}: Proxy upgraded`,
      description: (args: Result) =>
        `Proxy for ${l2WstethBridged.name}(${l2WstethBridged.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: Finding.Severity.CRITICAL,
      type: FindingType.INFORMATION,
    },
    {
      address: l2WstethBridged.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: `🚨 ${networkName}: Proxy beacon upgraded`,
      description: (args: Result) =>
        `Proxy for ${l2WstethBridged.name}(${l2WstethBridged.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    //---
    {
      address: l2TokenGateway.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: `🚨 ${networkName}: Proxy ossified`,
      description: () =>
        `Proxy for ${l2TokenGateway.name}(${l2TokenGateway.address}) was ossified` + `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: `🚨 ${networkName}: Proxy admin changed`,
      description: (args: Result) =>
        `Proxy admin for ${l2TokenGateway.name}(${l2TokenGateway.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: `🚨 ${networkName}: Proxy upgraded`,
      description: (args: Result) =>
        `Proxy for ${l2TokenGateway.name}(${l2TokenGateway.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: l2TokenGateway.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: `🚨 ${networkName}: Proxy beacon upgraded`,
      description: (args: Result) =>
        `Proxy for ${l2TokenGateway.name}(${l2TokenGateway.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
  ]
}
