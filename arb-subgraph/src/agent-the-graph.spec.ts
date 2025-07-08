import { Contract } from 'ethers'
import * as forta from 'forta-agent'

import { handleBlock } from './agent-the-graph'

jest.mock('ethers')

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
        blockNumber: 100,
      }

      // https://github.com/OlympusDAO/olympus-frontend/pull/1569
      ;(Contract.prototype as any).functions = {
        userBalances: () => 1,
      }

      const findings = await handleBlock(fakeEvent as any)
      expect(findings.length).toEqual(1)
      expect(findings.at(0)).toEqual(
        expect.objectContaining({
          alertId: 'LOW-LIDO-GRAPH-BALANCE',
          severity: forta.FindingSeverity.High,
          type: forta.FindingType.Degraded,
          metadata: expect.objectContaining({
            balance: '0.00',
          }),
        }),
      )
    })
  })
})
