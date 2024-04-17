import { formatTime, elapsedTime, formatDelay } from './time'

describe('Time utility functions', () => {
  it('formats time correctly', () => {
    const timeInMillis = 5000
    const result = formatTime(timeInMillis)
    expect(result).toBe('5.000 seconds')
  })

  it('calculates elapsed time correctly', () => {
    const methodName = 'testMethod'
    const startTime = new Date().getTime() - 5000
    const result = elapsedTime(methodName, startTime)
    expect(result).toContain(`${methodName} started at`)
    expect(result).toContain('Elapsed: 5.000 seconds')
  })

  it('formats delay correctly for positive full delay', () => {
    const fullDelaySec = 3661
    const result = formatDelay(fullDelaySec)
    expect(result).toBe('1 hrs 1 min 1 sec')
  })

  it('formats delay correctly for negative full delay', () => {
    const fullDelaySec = -3661
    const result = formatDelay(fullDelaySec)
    expect(result).toBe('-1 hrs 1 min 1 sec')
  })

  it('formats delay correctly for zero full delay', () => {
    const fullDelaySec = 0
    const result = formatDelay(fullDelaySec)
    expect(result).toBe('0 sec')
  })
})
