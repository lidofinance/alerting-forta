import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { Result } from '@ethersproject/abi/lib'

export const GATEWAY_SET_EVENT = 'event GatewaySet(address indexed l1Token, address indexed gateway)'

export function getL1RouterEvents(routerAddress: string, networkName: string): EventOfNotice[] {
  return [
    {
      address: routerAddress,
      event: GATEWAY_SET_EVENT,
      alertId: 'TOKEN-GATEWAY-CHANGED',
      name: `🚨🚨🚨 ${networkName}: Token Gateway changed`,
      description: (args: Result) =>
        `${networkName} native bridge gateway for wstETH ${args.l1Token} changed to: ${args.gateway}`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.SUSPICIOUS,
    },
    {
      address: routerAddress,
      event: 'event AdminChanged(address previousAdmin, address newAdmin)',
      alertId: 'THIRD-PARTY-PROXY-ADMIN-CHANGED',
      name: `🚨 ${networkName} Native Bridge: L1 Gateway Router proxy admin changed`,
      description: (args: Result) =>
        `Proxy admin for ${networkName}: L1 Gateway Router was changed \n` +
        `from: ${args.previousAdmin}\n` +
        `to: ${args.newAdmin}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: routerAddress,
      event: 'event Upgraded(address indexed implementation)',
      alertId: 'THIRD-PARTY-PROXY-UPGRADED',
      name: `🚨 ${networkName} Native Bridge: L1 Gateway Router proxy upgraded`,
      description: (args: Result) =>
        `Proxy for ${networkName}: L1 Gateway Router was upgraded to ${args.implementation}`,
      severity: Finding.Severity.HIGH,
      type: Finding.FindingType.INFORMATION,
    },
  ]
}
