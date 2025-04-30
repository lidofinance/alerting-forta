import { BlockEvent, Finding, FindingSeverity } from 'forta-agent'
import BigNumber from 'bignumber.js'
import { rageQuitEscrowThresholdHandler, RageQuitThresholdResult } from '../handlers'

const calculateSupport = (percentage: number, total: BigNumber): BigNumber => {
  if (total.lte(0)) {
    return new BigNumber(0)
  }
  const support = total.multipliedBy(percentage).dividedBy(100)
  return BigNumber.min(total, support.dp(0, BigNumber.ROUND_UP))
}

const createMockBlockEvent = (): BlockEvent =>
  ({
    blockNumber: 1000,
    block: {
      number: 1000,
      timestamp: Date.now() / 1000,
      hash: '0xblockhash',
    },
  }) as BlockEvent

const expectNoFinding = (result: RageQuitThresholdResult, expectedLevel: number) => {
  expect(result.finding).toBe(false)
  expect(result.triggeredLevel).toBe(expectedLevel)
}

const expectFinding = (
  result: RageQuitThresholdResult,
  threshold: number,
  severity: FindingSeverity,
  lastAlertedLevel: number,
) => {
  expect(result.finding).toBeInstanceOf(Finding)
  if (result.finding instanceof Finding) {
    expect(result.finding.alertId).toBe(`DUAL-GOVERNANCE-RAGE-QUIT-THRESHOLD-${threshold}`)
    expect(result.finding.severity).toBe(severity)
    expect(result.finding.metadata?.thresholdLevelChecked).toBe(threshold.toString())
    expect(result.finding.metadata?.lastAlertedLevelBefore).toBe(lastAlertedLevel.toString())
    expect(result.triggeredLevel).toBe(threshold)
  }
}

describe('rageQuitEscrowThresholdHandler', () => {
  const MOCK_SECOND_SEAL_THRESHOLD = new BigNumber('15000e18')
  let mockBlockEvent: BlockEvent

  beforeEach(() => {
    mockBlockEvent = createMockBlockEvent()
  })

  it('should return no finding when secondSealRageQuitSupport is zero or negative', () => {
    const testCases = [new BigNumber(0), new BigNumber(-1000)]
    testCases.forEach((secondSeal) => {
      const result = rageQuitEscrowThresholdHandler({
        rageQuitSupport: new BigNumber('100e18'),
        secondSealSupport: secondSeal,
        blockEvent: mockBlockEvent,
        lastAlertedLevel: 0,
      })
      expectNoFinding(result, 0)
    })
  })

  describe('when lastAlertedLevel is 0', () => {
    const lastAlertedLevel = 0

    it('should return no finding below 50%', () => {
      const result = rageQuitEscrowThresholdHandler({
        rageQuitSupport: calculateSupport(45, MOCK_SECOND_SEAL_THRESHOLD),
        secondSealSupport: MOCK_SECOND_SEAL_THRESHOLD,
        blockEvent: mockBlockEvent,
        lastAlertedLevel,
      })
      expectNoFinding(result, 0)
    })

    const thresholdTests = [
      { percent: 51, threshold: 50, severity: FindingSeverity.Medium },
      { percent: 87, threshold: 85, severity: FindingSeverity.Medium },
      { percent: 100, threshold: 100, severity: FindingSeverity.Critical },
      { percent: 101, threshold: 100, severity: FindingSeverity.Critical, usePlus: true },
      { percent: 96, threshold: 95, severity: FindingSeverity.Critical },
    ]

    thresholdTests.forEach(({ percent, threshold, severity, usePlus }) => {
      it(`should return ${threshold}% finding when crossing ${percent}%`, () => {
        const rageQuitSupport = usePlus
          ? MOCK_SECOND_SEAL_THRESHOLD.plus('1e18')
          : calculateSupport(percent, MOCK_SECOND_SEAL_THRESHOLD)
        const result = rageQuitEscrowThresholdHandler({
          rageQuitSupport,
          secondSealSupport: MOCK_SECOND_SEAL_THRESHOLD,
          blockEvent: mockBlockEvent,
          lastAlertedLevel,
        })
        expectFinding(result, threshold, severity, lastAlertedLevel)
      })
    })
  })

  describe('when lastAlertedLevel is 50', () => {
    const lastAlertedLevel = 50

    const noFindingTests = [
      { percent: 45, expectedLevel: 50 },
      { percent: 50, expectedLevel: 50 },
      { percent: 70, expectedLevel: 50 },
    ]

    noFindingTests.forEach(({ percent, expectedLevel }) => {
      it(`should return no finding at ${percent}%`, () => {
        const result = rageQuitEscrowThresholdHandler({
          rageQuitSupport: calculateSupport(percent, MOCK_SECOND_SEAL_THRESHOLD),
          secondSealSupport: MOCK_SECOND_SEAL_THRESHOLD,
          blockEvent: mockBlockEvent,
          lastAlertedLevel,
        })
        expectNoFinding(result, expectedLevel)
      })
    })

    const findingTests = [
      { percent: 85, threshold: 85, severity: FindingSeverity.Medium },
      { percent: 100, threshold: 100, severity: FindingSeverity.Critical },
    ]

    findingTests.forEach(({ percent, threshold, severity }) => {
      it(`should return ${threshold}% finding at ${percent}%`, () => {
        const result = rageQuitEscrowThresholdHandler({
          rageQuitSupport: calculateSupport(percent, MOCK_SECOND_SEAL_THRESHOLD),
          secondSealSupport: MOCK_SECOND_SEAL_THRESHOLD,
          blockEvent: mockBlockEvent,
          lastAlertedLevel,
        })
        expectFinding(result, threshold, severity, lastAlertedLevel)
      })
    })
  })

  describe('when lastAlertedLevel is 100', () => {
    const lastAlertedLevel = 100

    it('should return no finding at or above 100%', () => {
      const testCases = [calculateSupport(100, MOCK_SECOND_SEAL_THRESHOLD), MOCK_SECOND_SEAL_THRESHOLD.plus('1e18')]
      testCases.forEach((rageQuitSupport) => {
        const result = rageQuitEscrowThresholdHandler({
          rageQuitSupport,
          secondSealSupport: MOCK_SECOND_SEAL_THRESHOLD,
          blockEvent: mockBlockEvent,
          lastAlertedLevel,
        })
        expectNoFinding(result, 100)
      })
    })
  })
})
