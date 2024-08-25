import { Finding } from '../generated/proto/alert_pb'
import { strict as assert } from 'node:assert'

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

export function findingFromObject(params: {
  alertId: string,
  name: string,
  description: string,
  severity: Finding.Severity,
  uniqueKey?: string,
  metadata?: { [key: string]: string },
}) {

  const f = new Finding()

  f.setName(params.name)
  // f.setDescription(infraLine + lastBlockLine + diffLine)
  f.setAlertid(params.alertId)
  f.setSeverity(params.severity)
  f.setType(Finding.FindingType.SUSPICIOUS)
  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      f.getMetadataMap().set(key, value)
    }
  }
  if (params.uniqueKey) {
    f.setUniquekey(params.uniqueKey)
  }
  // f.setProtocol('ethereum')

  return f
}