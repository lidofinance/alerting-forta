import BigNumber from 'bignumber.js'
import { Result } from '@ethersproject/abi/lib'
import { EventOfNotice } from '../../entity/events'
import { Finding } from '../../generated/proto/alert_pb'
import { CSM_PROXY_CONTRACTS, Proxy } from '../constants.holesky'
import { toKebabCase } from '../string'

export function getPausableEvents(): EventOfNotice[] {
  return CSM_PROXY_CONTRACTS.filter((proxyInfo: Proxy) => proxyInfo.name !== 'CSFeeDistributor').flatMap(
    (proxyInfo: Proxy) => {
      return [
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
    },
  )
}
