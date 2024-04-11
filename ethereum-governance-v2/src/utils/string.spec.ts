import { getMotionType } from './string'

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
