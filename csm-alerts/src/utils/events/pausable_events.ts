import BigNumber from 'bignumber.js'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { LIDO_PROXY_CONTRACTS, LidoProxy } from '../constants.holesky'
import { toKebabCase } from '../string'

const PAUSABLE_EVENTS: EventOfNotice[] = LIDO_PROXY_CONTRACTS.map((proxyInfo: LidoProxy) => {
  const eventsDesc: EventOfNotice[] = [
    {
      address: proxyInfo.address,
      abi: 'event Paused(uint256 duration)',
      alertId: `${toKebabCase(proxyInfo.name)}-PAUSED`,
      name: `🟣 ${proxyInfo.name}: contract was paused`,
      description: (args: Result) => `For ${new BigNumber(args.duration).div(60 * 60).toFixed()} hours`,
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
    {
      address: proxyInfo.address,
      abi: 'event Resumed()',
      alertId: `${toKebabCase(proxyInfo.name)}-UNPAUSED`,
      name: `🟣 ${proxyInfo.name}: contract was resumed`,
      description: () => 'Contract was resumed',
      severity: Finding.Severity.CRITICAL,
      type: Finding.FindingType.INFORMATION,
    },
  ]
  return eventsDesc
}).reduce((a, b) => [...a, ...b])

export function getPausableEvents(): EventOfNotice[] {
  return PAUSABLE_EVENTS
}
