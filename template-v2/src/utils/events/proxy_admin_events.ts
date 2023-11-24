import {
  BASE_WST_ETH_BRIDGED_ADDRESS,
  L2_ERC20_TOKEN_GATEWAY_ADDRESS,
} from '../constants'
import { EventOfNotice } from '../../entity/events'
import { FindingSeverity, FindingType } from 'forta-agent'
import { Result } from '@ethersproject/abi/lib'

type LidoProxy = {
  name: string
  address: string
}

export const LIDO_PROXY_CONTRACTS: LidoProxy[] = [
  {
    name: 'WstETH ERC20Bridged',
    address: BASE_WST_ETH_BRIDGED_ADDRESS,
  },
  {
    name: 'L2ERC20TokenGateway',
    address: L2_ERC20_TOKEN_GATEWAY_ADDRESS,
  },
]

function generateProxyAdminEvents(
  LIDO_PROXY_CONTRACTS: LidoProxy[],
): EventOfNotice[] {
  const out: EventOfNotice[] = []

  for (const contract of LIDO_PROXY_CONTRACTS) {
    const contractEvents: EventOfNotice[] = [
      {
        address: contract.address,
        event: 'event ProxyOssified()',
        alertId: 'PROXY-OSSIFIED',
        name: '🚨 Base: Proxy ossified',
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        description: (args: Result) =>
          `Proxy for ${contract.name}(${contract.address}) was ossified` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
      {
        address: contract.address,
        event: 'event AdminChanged(address previousAdmin, address newAdmin)',
        alertId: 'PROXY-ADMIN-CHANGED',
        name: '🚨 Base: Proxy admin changed',
        description: (args: Result) =>
          `Proxy admin for ${contract.name}(${contract.address}) ` +
          `was changed from ${args.previousAdmin} to ${args.newAdmin}` +
          `\n(detected by event)`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
      {
        address: contract.address,
        event: 'event Upgraded(address indexed implementation)',
        alertId: 'PROXY-UPGRADED',
        name: '🚨 Base: Proxy upgraded',
        description: (args: Result) =>
          `Proxy for ${contract.name}(${contract.address}) ` +
          `was updated to ${args.implementation}` +
          `\n(detected by event)`,
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      },
      {
        address: contract.address,
        event: 'event BeaconUpgraded(address indexed beacon)',
        alertId: 'PROXY-BEACON-UPGRADED',
        name: '🚨 Base: Proxy beacon upgraded',
        description: (args: Result) =>
          `Proxy for ${contract.name}(${contract.address}) ` +
          `beacon was updated to ${args.beacon}` +
          `\n(detected by event)`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      },
    ]

    out.push(...contractEvents)
  }

  return out
}

export const PROXY_ADMIN_EVENTS: EventOfNotice[] =
  generateProxyAdminEvents(LIDO_PROXY_CONTRACTS)
