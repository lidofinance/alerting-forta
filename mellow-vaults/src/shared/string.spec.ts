import { DEFAULT_ADMIN_ROLE, etherscanAddress, roleByName } from './string'
import { keccak256 } from 'forta-agent'

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
    expect(result).toBe(`[${address}](https://goerli.etherscan.io/address/${address})`)
  })
})

describe('roleByName', () => {
  it('returns correct role for given name', () => {
    const name = 'ROLE_NAME'
    const result = roleByName(name)
    expect(result).toEqual({
      name: 'ROLE NAME',
      hash: keccak256(name),
    })
  })

  it('returns correct role for default admin role', () => {
    const name = 'DEFAULT_ADMIN_ROLE'
    const result = roleByName(name)
    expect(result).toEqual({
      name: 'DEFAULT ADMIN ROLE',
      hash: DEFAULT_ADMIN_ROLE,
    })
  })
})
