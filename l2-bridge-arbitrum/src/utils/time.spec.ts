import { isWorkInterval, SECONDS_60, SECONDS_768 } from './time'

describe('test time', () => {
  const l1Timestamp = Math.round(+new Date() / 1000)

  test('future l2Block is true', () => {
    const l2Timestamp = l1Timestamp + SECONDS_60
    expect(isWorkInterval(l1Timestamp, l2Timestamp)).toEqual(true)
  })

  test('future l2Block is false', () => {
    const l2Timestamp = l1Timestamp + 61

    expect(isWorkInterval(l1Timestamp, l2Timestamp)).toEqual(false)
  })

  test('future l2Block is true', () => {
    const l2Timestamp = l1Timestamp + SECONDS_60

    expect(isWorkInterval(l1Timestamp, l2Timestamp)).toEqual(true)
  })

  test('past l2Block is true', () => {
    const l2Timestamp = l1Timestamp - SECONDS_768

    expect(isWorkInterval(l1Timestamp, l2Timestamp)).toEqual(true)
  })

  test('past l2Block is false', () => {
    const l2Timestamp = l1Timestamp - 769

    expect(isWorkInterval(l1Timestamp, l2Timestamp)).toEqual(false)
  })
})
