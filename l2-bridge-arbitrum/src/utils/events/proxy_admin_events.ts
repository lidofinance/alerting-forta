import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import FindingType = Finding.FindingType
import { ContractInfo } from '../constants'
import { Result } from '@ethersproject/abi/lib'

function stubProxyAdminEvents(contractInfo: ContractInfo, networkName: string): EventOfNotice[] {
  return [
    {
      address: contractInfo.address,
      event: 'event ProxyOssified()',
      alertId: 'PROXY-OSSIFIED',
      name: `🚨 ${networkName}: Proxy ossified`,
      description: () =>
        `Proxy for ${contractInfo.name}(${contractInfo.address}) was ossified` + `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
    {
      address: contractInfo.address,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'PROXY-ADMIN-CHANGED',
      name: `🚨 ${networkName}: Proxy admin changed`,
      description: (args: Result) =>
        `Proxy admin for ${contractInfo.name}(${contractInfo.address}) ` +
        `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
        `\n(detected by event)`,
      severity: Finding.Severity.CRITICAL,
      type: FindingType.INFORMATION,
    },
    {
      address: contractInfo.address,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'PROXY-UPGRADED',
      name: `🚨 ${networkName}: Proxy upgraded`,
      description: (args: Result) =>
        `Proxy for ${contractInfo.name}(${contractInfo.address}) ` +
        `was updated to ${args.implementation}` +
        `\n(detected by event)`,
      severity: Finding.Severity.CRITICAL,
      type: FindingType.INFORMATION,
    },
    {
      address: contractInfo.address,
      event: 'event BeaconUpgraded(address indexed beacon)',
      alertId: 'PROXY-BEACON-UPGRADED',
      name: `🚨 ${networkName}: Proxy beacon upgraded`,
      description: (args: Result) =>
        `Proxy for ${contractInfo.name}(${contractInfo.address}) ` +
        `beacon was updated to ${args.beacon}` +
        `\n(detected by event)`,
      severity: Finding.Severity.HIGH,
      type: FindingType.INFORMATION,
    },
  ]
}

export function getL2ProxyAdminEvents(
  l2WstethBridged: ContractInfo,
  l2TokenGateway: ContractInfo,
  networkName: string,
): EventOfNotice[] {
  return [...stubProxyAdminEvents(l2WstethBridged, networkName), ...stubProxyAdminEvents(l2TokenGateway, networkName)]
}

export function getL1ProxyAdminEvents(l1TokenGateway: ContractInfo, networkName: string): EventOfNotice[] {
  return stubProxyAdminEvents(l1TokenGateway, networkName)
}
