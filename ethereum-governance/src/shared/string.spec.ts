import { DEFAULT_ADMIN_ROLE, etherscanAddress, getMotionType, roleByName } from './string'
import { keccak256 } from 'forta-agent'

describe('getMotionType', () => {
  const types = new Map<string, string>()
  types.set('0x123', 'Type1')
  types.set('0x456', 'Type2')

  it('returns the correct type when the evmScriptFactory is in the types map', () => {
    const result = getMotionType(types, '0x123')
    expect(result).toBe('Type1')
  })

  it('returns the correct type when the evmScriptFactory is not in the types map', () => {
    const result = getMotionType(types, '0x789')
    expect(result).toBe('New ')
  })

  it('returns the correct type when the evmScriptFactory is in the types map but in different case', () => {
    const result = getMotionType(types, '0X123')
    expect(result).toBe('Type1')
  })
})

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
