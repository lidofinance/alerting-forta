import { handleBridgeBalance } from './handlers'
import * as agent from 'forta-agent'

import { BlockEvent, FindingSeverity, FindingType } from 'forta-agent'
import BigNumber from 'bignumber.js'
import { BRIDGE_ETH_MIN_BALANCE, BRIDGE_LINK_MIN_BALANCE } from '../../shared/constants/cross-chain/mainnet'

const mockProvider = {
  getBalance: jest.fn(),
}
const mockContract = {
  balanceOf: jest.fn(),
}

jest.mock('@ethersproject/contracts', () => {
  return {
    Contract: jest.fn().mockImplementation(() => mockContract),
  }
})

describe('handleBridgeBalance', () => {
  let event: BlockEvent

  beforeEach(() => {
    const random = Math.floor(Math.random() * 1000)
    event = { block: { number: 300 * random } } as BlockEvent
    jest.spyOn(agent, 'getEthersProvider').mockReturnValue(mockProvider as never)
  })

  it('returns an empty array if block number is not a multiple of 7200', async () => {
    event = { block: { number: 123 } } as BlockEvent
    const findings = await handleBridgeBalance(event as never)
    expect(findings).toEqual([])
  })

  it('returns a finding if ETH balance is below the minimum threshold', async () => {
    mockProvider.getBalance.mockResolvedValue(BigNumber(1e18 * (BRIDGE_ETH_MIN_BALANCE - 0.1)))

    mockContract.balanceOf.mockResolvedValue(BigNumber(1e18 * BRIDGE_LINK_MIN_BALANCE))

    const findings = await handleBridgeBalance(event as never)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      name: '⚠️ Cross-chain bridge ETH balance is low (0.5 ETH min)',
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    })
  })

  it('returns a finding if LINK balance is below the minimum threshold', async () => {
    mockProvider.getBalance.mockResolvedValue(BigNumber(1e18 * BRIDGE_ETH_MIN_BALANCE))
    mockContract.balanceOf.mockResolvedValue(BigNumber(1e18 * (BRIDGE_LINK_MIN_BALANCE - 0.1)))

    const findings = await handleBridgeBalance(event as never)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      name: '⚠️ Cross-chain bridge LINK balance is low (5 LINK min)',
      severity: FindingSeverity.Medium,
      type: FindingType.Info,
    })
  })

  it('returns findings for both ETH and LINK balances below the minimum threshold', async () => {
    mockProvider.getBalance.mockResolvedValue(BigNumber(1e18 * (BRIDGE_ETH_MIN_BALANCE - 0.1)))
    mockContract.balanceOf.mockResolvedValue(BigNumber(1e18 * (BRIDGE_LINK_MIN_BALANCE - 0.1)))

    const findings = await handleBridgeBalance(event as never)

    expect(findings).toHaveLength(2)
  })

  it('returns an empty array if both ETH and LINK balances are above the minimum threshold', async () => {
    mockProvider.getBalance.mockResolvedValue(BigNumber(1e18 * BRIDGE_ETH_MIN_BALANCE))
    mockContract.balanceOf.mockResolvedValue(BigNumber(1e18 * BRIDGE_LINK_MIN_BALANCE))

    const findings = await handleBridgeBalance(event as never)

    expect(findings).toEqual([])
  })

  it('returns an array of network errors if there are errors', async () => {
    mockProvider.getBalance.mockRejectedValue(new Error('Network ETH error'))
    mockContract.balanceOf.mockRejectedValue(new Error('Network LINK error'))

    const findings = await handleBridgeBalance(event as never)

    expect(findings).toHaveLength(2)
    expect(findings[0].alertId).toEqual('NETWORK-ERROR')
    expect(findings[1].alertId).toEqual('NETWORK-ERROR')
    expect(findings[0].name).toEqual('handleBridgeBalance')
    expect(findings[1].name).toEqual('handleBridgeBalance')
    expect(findings[0].description).toEqual(`Error fetching bridge ETH balance on block ${event.block.number}`)
    expect(findings[1].description).toEqual(`Error fetching bridge LINK balance on block ${event.block.number}`)
    expect(findings[0].metadata).toMatchObject({
      message: 'Network ETH error',
    })
    expect(findings[1].metadata).toMatchObject({
      message: 'Network LINK error',
    })
  })
})
