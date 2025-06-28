import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import BigNumber from 'bignumber.js'
import { formatAmount } from '../../../shared/string'

type Props = {
  rageQuitSupport: BigNumber
  secondSealSupport: BigNumber
  blockEvent: BlockEvent
  lastAlertedLevel: number
}

export type RageQuitThresholdResult = {
  finding: Finding | false
  triggeredLevel: number
}

const RAGE_QUIT_THRESHOLDS_PERCENT = [
  { level: 100, severity: FindingSeverity.Critical },
  { level: 95, severity: FindingSeverity.Critical },
  { level: 85, severity: FindingSeverity.Medium },
  { level: 50, severity: FindingSeverity.Medium },
].sort((a, b) => b.level - a.level)

export function rageQuitEscrowThresholdHandler({
  rageQuitSupport,
  secondSealSupport,
  blockEvent,
  lastAlertedLevel,
}: Props): RageQuitThresholdResult {
  if (secondSealSupport.lte(0)) {
    return { finding: false, triggeredLevel: 0 }
  }

  const progressDecimal = rageQuitSupport.dividedBy(secondSealSupport)
  const currentProgressPercentBigNum = progressDecimal.multipliedBy(100)
  const currentProgressPercent = BigNumber.max(0, currentProgressPercentBigNum).toNumber()

  let highestMetThreshold = 0
  let finding: Finding | false = false
  let triggeredLevel = 0

  // From highest to lowest
  for (const threshold of RAGE_QUIT_THRESHOLDS_PERCENT) {
    if (currentProgressPercent >= threshold.level) {
      highestMetThreshold = threshold.level
      if (threshold.level > lastAlertedLevel) {
        finding = Finding.fromObject({
          alertId: `DUAL-GOVERNANCE-RAGE-QUIT-THRESHOLD-${threshold.level}`,
          name: `🚨RageQuit Threshold > ${threshold.level}%`,
          description: `RageQuit threshold progress reached ${currentProgressPercent.toFixed(2)}% (${threshold.level}% threshold). ${formatAmount(BigNumber.max(0, secondSealSupport.minus(rageQuitSupport)), 18)} more stETH needed to reach the full threshold.`,
          severity: threshold.severity,
          type: FindingType.Info,
          metadata: {
            rageQuitSupport: rageQuitSupport.toString(),
            secondSealThreshold: secondSealSupport.toString(),
            progressPercentCalculated: currentProgressPercent.toFixed(4),
            thresholdLevelChecked: threshold.level.toString(),
            lastAlertedLevelBefore: lastAlertedLevel.toString(),
            amountNeeded: BigNumber.max(0, secondSealSupport.minus(rageQuitSupport)).toString(),
            formattedAmountNeeded: formatAmount(BigNumber.max(0, secondSealSupport.minus(rageQuitSupport)), 18),
            blockNumber: blockEvent.blockNumber.toString(),
            blockHash: blockEvent.blockHash,
          },
        })
        triggeredLevel = threshold.level
        break
      }
    }
  }

  if (!finding) {
    triggeredLevel = highestMetThreshold >= lastAlertedLevel ? highestMetThreshold : lastAlertedLevel
  } else {
    triggeredLevel = highestMetThreshold
  }

  return { finding, triggeredLevel }
}
