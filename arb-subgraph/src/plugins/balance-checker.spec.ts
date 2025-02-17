import { Contract } from 'ethers'
import BigNumber from 'bignumber.js'

import { Finding } from '../generated/proto/alert_pb'

import { BalanceChecker } from './balance-checker'
import { Alerts } from './common/alerts'

jest.mock('ethers')

const alertsMock = new Alerts('arb-subgraph', {} as any, [])
const checkerMock = new BalanceChecker({ alerts: alertsMock } as any)

describe('the graph', () => {
  let logSpy: jest.SpyInstance

  beforeEach(async () => {
    logSpy = jest.spyOn(console, 'log')
    logSpy.mockImplementation(() => {})
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  describe('handleBlock', () => {
    it('should process block', async () => {
      const fakeEvent = {
        block: {
          timestamp: 1234567,
        },
        blockNumber: 1000,
      }

      // https://github.com/OlympusDAO/olympus-frontend/pull/1569
      ;(Contract.prototype as any).functions = {
        userBalances: () => new BigNumber('999999999999999999999'),
      }

      const expactedFinding = new Finding()
      expactedFinding.setName('🚨 Low balance of Lido account on The Graph')
      expactedFinding.setDescription('Balance is 1000.00 GRT. It is too low!')
      expactedFinding.setAlertid('LOW-LIDO-GRAPH-BALANCE')
      expactedFinding.setSeverity(Finding.Severity.HIGH)
      expactedFinding.setType(Finding.FindingType.DEGRADED)
      expactedFinding.setProtocol('ethereum')
      const expactedFindingMetadata = expactedFinding.getMetadataMap()
      expactedFindingMetadata.set('balance', '1000.00')
      expactedFindingMetadata.set('lido_vault_address', '0x421eB124FCbF69CE9B26C13719D7c288e6D6A94c')

      const finding = await checkerMock.checkSubgraphBalance(fakeEvent.block.timestamp, fakeEvent.blockNumber)

      expect(finding).toBeDefined()
      expect(finding).toEqual(expactedFinding)
    })

    it('should not process block by balance', async () => {
      const fakeEvent = {
        block: {
          timestamp: 12312,
        },
        blockNumber: 123123,
      }

      //
      ;(Contract.prototype as any).functions = {
        userBalances: () => new BigNumber('99999999999999999999999'),
      }

      const finding = await checkerMock.checkSubgraphBalance(fakeEvent.block.timestamp, fakeEvent.blockNumber)

      expect(finding).toBeNull()
    })

    it('should not process block', async () => {
      const fakeEvent = {
        block: {
          timestamp: 12312,
        },
        blockNumber: 123123,
      }

      //
      ;(Contract.prototype as any).functions = {
        userBalances: () => new BigNumber('999999999999999999999'),
      }

      const finding = await checkerMock.checkSubgraphBalance(fakeEvent.block.timestamp, fakeEvent.blockNumber)

      expect(finding).toBeNull()
    })
  })
})
