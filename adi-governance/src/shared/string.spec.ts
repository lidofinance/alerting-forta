import { etherscanAddress } from './string'

describe('etherscanAddress', () => {
  it('returns correct etherscan link for given address on mainnet', () => {
    process.env.FORTA_AGENT_RUN_TIER = 'mainnet'
    const address = '0x123'
    const result = etherscanAddress(address)
    expect(result).toBe(`[${address}](https://etherscan.io/address/${address})`)
  })

  it('returns correct etherscan link for given address on testnet', () => {
    process.env.FORTA_AGENT_RUN_TIER = 'testnet'
    const address = '0x456'
    const result = etherscanAddress(address)
    expect(result).toBe(`[${address}](https://holesky.etherscan.io/address/${address})`)
  })
})
