import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import assert from 'node:assert'

export const NetworkErrorFinding = 'NETWORK-ERROR'

export function networkAlert(err: Error, name: string, desc: string, blockNumber: number): Finding {
  return Finding.fromObject({
    name: name,
    description: desc,
    alertId: NetworkErrorFinding,
    severity: FindingSeverity.Unknown,
    type: FindingType.Degraded,
    metadata: {
      stack: `${err.stack}`,
      message: `${err.message}`,
      name: `${err.name}`,
    },
    uniqueKey: getUniqueKey(name, blockNumber),
  })
}

export function getUniqueKey(uniqueKey: string, blockNumber: number): string {
  return uniqueKey + '-' + blockNumber.toString()
}

export function formatEther(value: bigint, decimals: number) {
  // TODO: refactor
  assert(decimals >= 0 && decimals <= 17)
  const intWithDecimalsPlus1Zero = value / (10n ** (18n - BigInt(decimals) - 1n))
  const float = parseFloat(intWithDecimalsPlus1Zero.toString()) / parseFloat((10n ** BigInt(decimals + 1)).toString())
  return float.toFixed(decimals)
}