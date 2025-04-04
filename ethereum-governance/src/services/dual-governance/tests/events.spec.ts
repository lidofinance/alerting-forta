import { BlockEvent, Finding, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import * as E from 'fp-ts/Either'
import BigNumber from 'bignumber.js'
import {
  DUAL_GOVERNANCE_COMMITTEE_RELATED_EVENTS,
  DUAL_GOVERNANCE_PROPOSAL_STATUS_EVENTS,
  DUAL_GOVERNANCE_STATE_CHANGE_EVENTS,
} from '../events'
import { DualGovernanceConfig, DualGovernanceDetailedState, IDualGovernanceClient } from '../contract'
import { DualGovernanceSrv } from '../DualGovernance.srv'
import { handleEventsOfNotice } from '../../../shared/notice'
import { rageQuitEscrowThresholdHandler, vetoSignallingEscrowThresholdHandler } from '../handlers'
import { GovernanceState } from '../types'

jest.mock('../handlers')
jest.mock('../../../shared/notice')

describe('DualGovernanceSrv', () => {
  let logger: Logger
  let ethProvider: IDualGovernanceClient
  let dualGovernanceSrv: DualGovernanceSrv
  let txEvent: TransactionEvent
  let blockEvent: BlockEvent

  const configMock: DualGovernanceConfig = {
    firstSealRageQuitSupport: new BigNumber(3000),
    secondSealRageQuitSupport: new BigNumber(15000),
    minAssetsLockDuration: 300,
    vetoSignallingMinDuration: 300,
    vetoSignallingMaxDuration: 1500,
    vetoSignallingMinActiveDuration: 300,
    vetoSignallingDeactivationMaxDuration: 1800,
    vetoCooldownDuration: 300,
    rageQuitExtensionPeriodDuration: 300,
    rageQuitEthWithdrawalsMinDelay: 300,
    rageQuitEthWithdrawalsMaxDelay: 1800,
    rageQuitEthWithdrawalsDelayGrowth: 1296000,
  }

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger
    ethProvider = {
      getConfig: jest.fn(),
      getVetoSignallingEscrow: jest.fn(),
      getRageQuitEscrow: jest.fn(),
      getRageQuitSupport: jest.fn(),
      getDualGovernanceStateDetails: jest.fn(),
    } as unknown as IDualGovernanceClient
    dualGovernanceSrv = new DualGovernanceSrv(logger, ethProvider)
    txEvent = {
      addresses: {},
      filterLog: jest.fn(),
    } as unknown as TransactionEvent
    blockEvent = {
      blockNumber: 100,
    } as unknown as BlockEvent
    jest.clearAllMocks()
    ;(handleEventsOfNotice as jest.Mock).mockResolvedValue([])
    ;(vetoSignallingEscrowThresholdHandler as jest.Mock).mockReturnValue({})
    ;(rageQuitEscrowThresholdHandler as jest.Mock).mockReturnValue({})
  })

  it('returns the correct name', () => {
    expect(dualGovernanceSrv.getName()).toBe('DualGovernanceSrv')
  })

  describe('initialize', () => {
    it('initializes successfully and loads config and escrow addresses', async () => {
      const mockVetoEscrow = '0x123'
      const mockRageQuitEscrow = '0x456'
      jest.mocked(ethProvider.getConfig).mockResolvedValue(E.right(configMock))
      jest.mocked(ethProvider.getVetoSignallingEscrow).mockResolvedValue(E.right(mockVetoEscrow))
      jest.mocked(ethProvider.getRageQuitEscrow).mockResolvedValue(E.right(mockRageQuitEscrow))

      const error = await dualGovernanceSrv.initialize(100)
      expect(error).toBeNull()
      expect(ethProvider.getConfig).toHaveBeenCalledTimes(1)
      expect(ethProvider.getVetoSignallingEscrow).toHaveBeenCalledTimes(1)
      expect(ethProvider.getRageQuitEscrow).toHaveBeenCalledTimes(1)
      expect(dualGovernanceSrv['firstSealSupport']).toEqual(configMock.firstSealRageQuitSupport)
      expect(dualGovernanceSrv['secondSealSupport']).toEqual(configMock.secondSealRageQuitSupport)
      expect(dualGovernanceSrv['vetoSignallingEscrowAddress']).toBe(mockVetoEscrow)
      expect(dualGovernanceSrv['rageQuitEscrowAddress']).toBe(mockRageQuitEscrow)
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Starting initialization at block 100...'))
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`firstSealThreshold loaded: ${configMock.firstSealRageQuitSupport.toString()}`),
      )
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`secondSealThreshold loaded: ${configMock.secondSealRageQuitSupport.toString()}`),
      )
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('VetoSignalling Escrow address loaded: 0x123'))
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('RageQuit Escrow address loaded: 0x456'))
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Completed on 100'))
    })

    it('logs a warning if fetched seal thresholds are zero or negative', async () => {
      const mockConfigZeroNegative = {
        ...configMock,
        firstSealRageQuitSupport: new BigNumber(0),
        secondSealRageQuitSupport: new BigNumber(-1),
      }
      const mockVetoEscrow = '0x123'
      const mockRageQuitEscrow = '0x456'
      jest.mocked(ethProvider.getConfig).mockResolvedValue(E.right(mockConfigZeroNegative))
      jest.mocked(ethProvider.getVetoSignallingEscrow).mockResolvedValue(E.right(mockVetoEscrow))
      jest.mocked(ethProvider.getRageQuitEscrow).mockResolvedValue(E.right(mockRageQuitEscrow))

      await dualGovernanceSrv.initialize(100)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'One or more fetched SealThresholds are zero or negative. Threshold alerts may not work.',
        ),
      )
    })

    it('handles errors when fetching config', async () => {
      const mockError = new Error('Failed to fetch config')
      jest.mocked(ethProvider.getConfig).mockResolvedValue(E.left(mockError))

      const error = await dualGovernanceSrv.initialize(100)
      expect(error).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch SealThreshold: Error: Failed to fetch config'),
      )
    })

    it('handles errors when fetching veto signalling escrow address', async () => {
      const mockError = new Error('Failed to fetch veto escrow')
      jest.mocked(ethProvider.getConfig).mockResolvedValue(E.right(configMock))
      jest.mocked(ethProvider.getVetoSignallingEscrow).mockResolvedValue(E.left(mockError))

      const error = await dualGovernanceSrv.initialize(100)
      expect(error).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch VS escrow address: Error: Failed to fetch veto escrow'),
      )
    })

    it('handles errors when fetching rage quit escrow address', async () => {
      const mockVetoEscrow = '0x123'
      const mockError = new Error('Failed to fetch rage quit escrow')
      jest.mocked(ethProvider.getConfig).mockResolvedValue(E.right(configMock))
      jest.mocked(ethProvider.getVetoSignallingEscrow).mockResolvedValue(E.right(mockVetoEscrow))
      jest.mocked(ethProvider.getRageQuitEscrow).mockResolvedValue(E.left(mockError))

      const error = await dualGovernanceSrv.initialize(100)
      expect(error).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch VS escrow address: Error: Failed to fetch rage quit escrow'),
      )
    })
  })

  describe('handleTransaction', () => {
    it('calls handleEventsOfNotice with the correct events and returns its findings', async () => {
      const mockFindings: Finding[] = [
        Finding.fromObject({
          name: 'Test Finding',
          description: 'This is a test finding',
          alertId: 'TEST-FINDING',
          severity: 0,
          type: 0,
        }),
      ]
      ;(handleEventsOfNotice as jest.Mock).mockResolvedValue(mockFindings)

      const findings = await dualGovernanceSrv.handleTransaction(txEvent)

      expect(handleEventsOfNotice).toHaveBeenCalledWith(
        txEvent,
        expect.arrayContaining([
          ...DUAL_GOVERNANCE_STATE_CHANGE_EVENTS,
          ...DUAL_GOVERNANCE_PROPOSAL_STATUS_EVENTS,
          ...DUAL_GOVERNANCE_COMMITTEE_RELATED_EVENTS,
        ]),
      )
      expect(findings).toEqual(mockFindings)
      expect(logger.debug).toHaveBeenCalled()
    })
  })

  describe('handleBlock', () => {
    beforeEach(() => {
      dualGovernanceSrv['secondSealSupport'] = configMock.secondSealRageQuitSupport
      dualGovernanceSrv['vetoSignallingEscrowAddress'] = '0xveto'
      dualGovernanceSrv['rageQuitEscrowAddress'] = '0xragequit'
      dualGovernanceSrv['currentMonitoredState'] = GovernanceState.Normal
      dualGovernanceSrv['lastAlertedVetoSignallingThresholdLevel'] = 0
      dualGovernanceSrv['lastAlertedRageQuitThresholdLevel'] = 0
      jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.right(new BigNumber(15)))
    })

    it('skips veto checks if secondSealRageQuitSupport is zero or negative', async () => {
      dualGovernanceSrv['secondSealSupport'] = new BigNumber(0)
      const findings = await dualGovernanceSrv.handleBlock(blockEvent)
      expect(findings).toEqual([])
      expect(ethProvider.getRageQuitSupport).not.toHaveBeenCalled()
      expect(ethProvider.getDualGovernanceStateDetails).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        `[DualGovernanceSrv.handleBlock] Block 100. Second seal threshold not loaded or zero, skipping veto checks.`,
      )

      dualGovernanceSrv['secondSealSupport'] = new BigNumber(-5)
      const findingsNegative = await dualGovernanceSrv.handleBlock(blockEvent)
      expect(findingsNegative).toEqual([])
      expect(ethProvider.getRageQuitSupport).not.toHaveBeenCalled()
      expect(ethProvider.getDualGovernanceStateDetails).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        `[DualGovernanceSrv.handleBlock] Block 100. Second seal threshold not loaded or zero, skipping veto checks.`,
      )
    })

    it('fetches rage quit support and dual governance state details', async () => {
      const mockStateDetails: DualGovernanceDetailedState = {
        effectiveState: 0,
        persistedState: GovernanceState.Normal,
        persistedStateEnteredAt: 0,
        vetoSignallingActivatedAt: 0,
        vetoSignallingReactivationTime: 0,
        normalOrVetoCooldownExitedAt: 0,
        rageQuitRound: new BigNumber(0),
        vetoSignallingDuration: 0,
      }
      jest.mocked(ethProvider.getDualGovernanceStateDetails).mockResolvedValue(E.right(mockStateDetails))

      await dualGovernanceSrv.handleBlock(blockEvent)

      expect(ethProvider.getRageQuitSupport).toHaveBeenCalledWith('0xveto')
      expect(ethProvider.getDualGovernanceStateDetails).toHaveBeenCalledTimes(1)
    })

    it('logs an error and returns empty findings if fetching rage quit support fails', async () => {
      const mockError = new Error('Failed to fetch support')
      jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.left(mockError))

      const findings = await dualGovernanceSrv.handleBlock(blockEvent)

      expect(findings).toEqual([])
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch RageQuit support: Error: Failed to fetch support'),
      )
    })

    it('logs an error and returns empty findings if fetching dual governance state details fails', async () => {
      const mockError = new Error('Failed to fetch state details')
      jest.mocked(ethProvider.getDualGovernanceStateDetails).mockResolvedValue(E.left(mockError))

      const findings = await dualGovernanceSrv.handleBlock(blockEvent)

      expect(findings).toEqual([])
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch DualGovernance state details: Error: Failed to fetch state details'),
      )
    })

    it('resets threshold alert levels when governance state changes', async () => {
      const mockStateDetailsFromNormalToVeto: DualGovernanceDetailedState = {
        effectiveState: 1,
        persistedState: GovernanceState.VetoSignalling,
        persistedStateEnteredAt: 10,
        vetoSignallingActivatedAt: 10,
        vetoSignallingReactivationTime: 0,
        normalOrVetoCooldownExitedAt: 0,
        rageQuitRound: new BigNumber(0),
        vetoSignallingDuration: 1200,
      }
      jest
        .mocked(ethProvider.getDualGovernanceStateDetails)
        .mockResolvedValue(E.right(mockStateDetailsFromNormalToVeto))

      await dualGovernanceSrv.handleBlock(blockEvent)
      expect(dualGovernanceSrv['currentMonitoredState']).toBe(GovernanceState.VetoSignalling)
      expect(dualGovernanceSrv['lastAlertedVetoSignallingThresholdLevel']).toBe(0)
      expect(dualGovernanceSrv['lastAlertedRageQuitThresholdLevel']).toBe(0)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `Governance state changed from ${GovernanceState.Normal} to ${GovernanceState.VetoSignalling}. Resetting threshold alert levels.`,
        ),
      )

      const mockStateDetailsFromVetoToRageQuit: DualGovernanceDetailedState = {
        effectiveState: 2,
        persistedState: GovernanceState.RageQuit,
        persistedStateEnteredAt: 20,
        vetoSignallingActivatedAt: 10,
        vetoSignallingReactivationTime: 0,
        normalOrVetoCooldownExitedAt: 0,
        rageQuitRound: new BigNumber(1),
        vetoSignallingDuration: 1200,
      }
      jest
        .mocked(ethProvider.getDualGovernanceStateDetails)
        .mockResolvedValue(E.right(mockStateDetailsFromVetoToRageQuit))

      await dualGovernanceSrv.handleBlock(blockEvent)
      expect(dualGovernanceSrv['currentMonitoredState']).toBe(GovernanceState.RageQuit)
      expect(dualGovernanceSrv['lastAlertedVetoSignallingThresholdLevel']).toBe(0)
      expect(dualGovernanceSrv['lastAlertedRageQuitThresholdLevel']).toBe(0)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `Governance state changed from ${GovernanceState.VetoSignalling} to ${GovernanceState.RageQuit}. Resetting threshold alert levels.`,
        ),
      )
    })

    describe('VetoSignalling threshold check', () => {
      it('calls vetoSignallingEscrowThresholdHandler when in Normal state and firstSealSupport is positive', async () => {
        const mockStateDetails: DualGovernanceDetailedState = {
          effectiveState: 0,
          persistedState: GovernanceState.Normal,
          persistedStateEnteredAt: 0,
          vetoSignallingActivatedAt: 0,
          vetoSignallingReactivationTime: 0,
          normalOrVetoCooldownExitedAt: 0,
          rageQuitRound: new BigNumber(0),
          vetoSignallingDuration: 0,
        }
        jest.mocked(ethProvider.getDualGovernanceStateDetails).mockResolvedValue(E.right(mockStateDetails))
        jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.right(new BigNumber(1550)))
        dualGovernanceSrv['firstSealSupport'] = configMock.firstSealRageQuitSupport

        await dualGovernanceSrv.handleBlock(blockEvent)

        expect(vetoSignallingEscrowThresholdHandler).toHaveBeenCalledWith({
          rageQuitSupport: new BigNumber(1550),
          firstSealSupport: configMock.firstSealRageQuitSupport,
          blockEvent,
          lastAlertedLevel: 0,
        })
      })

      it('pushes finding and updates lastAlertedVetoSignallingThresholdLevel if handler returns a finding', async () => {
        const mockStateDetails: DualGovernanceDetailedState = {
          effectiveState: 0,
          persistedState: GovernanceState.Normal,
          persistedStateEnteredAt: 0,
          vetoSignallingActivatedAt: 0,
          vetoSignallingReactivationTime: 0,
          normalOrVetoCooldownExitedAt: 0,
          rageQuitRound: new BigNumber(0),
          vetoSignallingDuration: 0,
        }
        const mockFinding = Finding.fromObject({
          name: 'Veto Threshold Alert',
          description: 'Veto threshold crossed',
          alertId: 'VETO-THRESHOLD',
          severity: 2,
          type: 0,
        })
        ;(vetoSignallingEscrowThresholdHandler as jest.Mock).mockReturnValue({
          finding: mockFinding,
          triggeredLevel: 75,
        })
        jest.mocked(ethProvider.getDualGovernanceStateDetails).mockResolvedValue(E.right(mockStateDetails))
        jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.right(new BigNumber(2850)))
        dualGovernanceSrv['firstSealSupport'] = configMock.firstSealRageQuitSupport

        const findings = await dualGovernanceSrv.handleBlock(blockEvent)

        expect(findings).toEqual([mockFinding])
        expect(dualGovernanceSrv['lastAlertedVetoSignallingThresholdLevel']).toBe(75)
        expect(logger.info).toHaveBeenCalledWith(
          '[DualGovernanceSrv.handleBlock] New Veto Signalling threshold alert triggered: Level 75%',
        )
      })

      it('logs a warning if veto threshold is crossed but handler returns no finding', async () => {
        const mockStateDetails: DualGovernanceDetailedState = {
          effectiveState: 0,
          persistedState: GovernanceState.Normal,
          persistedStateEnteredAt: 0,
          vetoSignallingActivatedAt: 0,
          vetoSignallingReactivationTime: 0,
          normalOrVetoCooldownExitedAt: 0,
          rageQuitRound: new BigNumber(0),
          vetoSignallingDuration: 0,
        }
        ;(vetoSignallingEscrowThresholdHandler as jest.Mock).mockReturnValue({ triggeredLevel: 80 })
        jest.mocked(ethProvider.getDualGovernanceStateDetails).mockResolvedValue(E.right(mockStateDetails))
        jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.right(new BigNumber(3150)))
        dualGovernanceSrv['firstSealSupport'] = configMock.firstSealRageQuitSupport

        await dualGovernanceSrv.handleBlock(blockEvent)

        expect(logger.warn).toHaveBeenCalledWith(
          '[DualGovernanceSrv.handleBlock] VetoSignalling threshold 80% crossed, but handler returned no finding.',
        )
      })
    })

    describe('RageQuit threshold check', () => {
      beforeEach(() => {
        jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.right(new BigNumber(15)))
      })

      it('calls rageQuitEscrowThresholdHandler', async () => {
        const mockStateDetails: DualGovernanceDetailedState = {
          effectiveState: 2,
          persistedState: GovernanceState.VetoSignalling,
          persistedStateEnteredAt: 20,
          vetoSignallingActivatedAt: 0,
          vetoSignallingReactivationTime: 0,
          normalOrVetoCooldownExitedAt: 0,
          rageQuitRound: new BigNumber(1),
          vetoSignallingDuration: 0,
        }
        jest.mocked(ethProvider.getDualGovernanceStateDetails).mockResolvedValue(E.right(mockStateDetails))
        jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.right(new BigNumber(15)))
        dualGovernanceSrv['secondSealSupport'] = configMock.secondSealRageQuitSupport
        dualGovernanceSrv['currentMonitoredState'] = GovernanceState.VetoSignalling

        await dualGovernanceSrv.handleBlock(blockEvent)

        expect(rageQuitEscrowThresholdHandler).toHaveBeenCalledWith({
          rageQuitSupport: new BigNumber(15),
          secondSealSupport: configMock.secondSealRageQuitSupport,
          blockEvent,
          lastAlertedLevel: 0,
        })
      })

      it('pushes finding and updates lastAlertedRageQuitThresholdLevel if handler returns a finding', async () => {
        const mockStateDetails: DualGovernanceDetailedState = {
          effectiveState: 2,
          persistedState: GovernanceState.VetoSignalling,
          persistedStateEnteredAt: 20,
          vetoSignallingActivatedAt: 0,
          vetoSignallingReactivationTime: 0,
          normalOrVetoCooldownExitedAt: 0,
          rageQuitRound: new BigNumber(1),
          vetoSignallingDuration: 0,
        }
        const mockFinding = Finding.fromObject({
          name: 'RageQuit Threshold Alert',
          description: 'RageQuit threshold crossed',
          alertId: 'RAGEQUIT-THRESHOLD',
          severity: 2,
          type: 0,
        })
        ;(rageQuitEscrowThresholdHandler as jest.Mock).mockReturnValue({
          finding: mockFinding,
          triggeredLevel: 80,
        })
        jest.mocked(ethProvider.getDualGovernanceStateDetails).mockResolvedValue(E.right(mockStateDetails))
        jest.mocked(ethProvider.getRageQuitSupport).mockResolvedValue(E.right(new BigNumber(12000)))
        dualGovernanceSrv['secondSealSupport'] = configMock.secondSealRageQuitSupport
        dualGovernanceSrv['currentMonitoredState'] = GovernanceState.VetoSignalling

        const findings = await dualGovernanceSrv.handleBlock(blockEvent)

        expect(findings).toEqual([mockFinding])
        expect(dualGovernanceSrv['lastAlertedRageQuitThresholdLevel']).toBe(80)
        expect(logger.info).toHaveBeenCalledWith(
          '[DualGovernanceSrv.handleBlock] New RageQuit threshold alert triggered: Level 80%',
        )
      })
    })
  })
})
