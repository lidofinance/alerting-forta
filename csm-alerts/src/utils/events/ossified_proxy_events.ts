import { EventOfNotice } from '../../entity/events'
import { Result } from '@ethersproject/abi/lib'
import { etherscanAddress } from '../string'
import { Finding } from '../../generated/proto/alert_pb'

interface Proxy {
  name: string
  address: string
  functions: Map<string, string>
}

export function getOssifiedProxyEvents(CSM_PROXY_CONTRACTS: Proxy[]): EventOfNotice[] {
  return CSM_PROXY_CONTRACTS.flatMap((proxyInfo: Proxy) => {
    return [
      {
        address: proxyInfo.address,
        abi: 'event ProxyOssified()',
        alertId: 'PROXY-OSSIFIED',
        name: `🚨 ${proxyInfo.name}: Proxy Ossified`,
        description: () => `Proxy for ${proxyInfo.name}(${etherscanAddress(proxyInfo.address)}) was ossified`,
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: proxyInfo.address,
        abi: 'event Upgraded(address indexed implementation)',
        alertId: 'PROXY-UPGRADED',
        name: `🚨 ${proxyInfo.name}: Implementation Upgraded`,
        description: (args: Result) =>
          `The proxy implementation has been upgraded to ${args.implementation.toLowerCase()}`,
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: proxyInfo.address,
        abi: 'event AdminChanged(address previousAdmin, address newAdmin)',
        alertId: 'PROXY-ADMIN-CHANGED',
        name: `🚨 ${proxyInfo.name}: Admin Changed`,
        description: (args: Result) =>
          `The proxy admin for ${proxyInfo.name}(${proxyInfo.address}) has been changed from ${etherscanAddress(args.previousAdmin)} to ${etherscanAddress(args.newAdmin)}`,
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
      {
        address: proxyInfo.address,
        abi: 'event BeaconUpgraded(address indexed beacon)',
        alertId: 'PROXY-BEACON-UPGRADED',
        name: `🚨 ${proxyInfo.address}: Beacon Upgraded`,
        description: (args: Result) => `The proxy beacon has been upgraded to ${etherscanAddress(args.beacon)}`,
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      },
    ]
  })
}
