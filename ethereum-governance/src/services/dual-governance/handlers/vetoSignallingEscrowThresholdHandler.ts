import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import BigNumber from 'bignumber.js'
import { formatAmount } from '../../../shared/string'

type Props = {
  rageQuitSupport: BigNumber
  firstSealSupport: BigNumber
  blockEvent: BlockEvent
  lastAlertedLevel: number
}

export type VetoSignallingThresholdResult = {
  finding: Finding | false
  triggeredLevel: number
}

const VETO_THRESHOLDS_PERCENT = [
  { level: 100, severity: FindingSeverity.Critical },
  { level: 95, severity: FindingSeverity.Critical },
  { level: 85, severity: FindingSeverity.Medium },
  { level: 50, severity: FindingSeverity.Medium },
  { level: 30, severity: FindingSeverity.Info },
].sort((a, b) => b.level - a.level)

export function vetoSignallingEscrowThresholdHandler({
  rageQuitSupport,
  firstSealSupport,
  blockEvent,
  lastAlertedLevel,
}: Props): VetoSignallingThresholdResult {
  if (firstSealSupport.lte(0)) {
    return { finding: false, triggeredLevel: 0 }
  }

  const progressDecimal = rageQuitSupport.dividedBy(firstSealSupport)
  const currentProgressPercentBigNum = progressDecimal.multipliedBy(100)
  const currentProgressPercent = BigNumber.max(0, currentProgressPercentBigNum).toNumber()

  const amountNeededWei = BigNumber.max(0, firstSealSupport.minus(rageQuitSupport))
  const formattedAmountNeeded = formatAmount(amountNeededWei, 18)

  let highestMetThreshold = 0

  // From highest to lowest
  for (const threshold of VETO_THRESHOLDS_PERCENT) {
    if (currentProgressPercent >= threshold.level) {
      highestMetThreshold = threshold.level

      if (threshold.level > lastAlertedLevel) {
        return {
          finding: Finding.fromObject({
            alertId: `DUAL-GOVERNANCE-VETO-SIGNALLING-THRESHOLD-${threshold.level}`,
            name: `🚨VetoSignaling Threshold > ${threshold.level}%`,
            description: `VetoSignaling threshold progress reached ${currentProgressPercent.toFixed(2)}% (${threshold.level}% threshold). ${formattedAmountNeeded} more stETH needed to reach the full threshold.`,
            severity: threshold.severity,
            type: FindingType.Info,
            metadata: {
              rageQuitSupport: rageQuitSupport.toString(),
              secondSealThreshold: firstSealSupport.toString(),
              progressPercentCalculated: currentProgressPercent.toFixed(4),
              thresholdLevelChecked: threshold.level.toString(),
              lastAlertedLevelBefore: lastAlertedLevel.toString(),
              amountNeeded: amountNeededWei.toString(),
              formattedAmountNeeded: formattedAmountNeeded,
              blockNumber: blockEvent.blockNumber.toString(),
              blockHash: blockEvent.blockHash,
            },
          }),
          triggeredLevel: threshold.level,
        }
      } else {
        break
      }
    }
  }

  return { finding: false, triggeredLevel: highestMetThreshold }
}
