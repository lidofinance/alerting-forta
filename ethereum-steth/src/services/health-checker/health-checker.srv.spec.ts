import * as promClient from 'prom-client'
import * as Winston from 'winston'
import { networkAlert } from '../../utils/errors'
import { Metrics } from '../../utils/metrics/metrics'
import { HealthChecker } from './health-checker.srv'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('HealthChecker', () => {
  const networkFindings = [networkAlert(new Error('Some err'), 'err name', 'err desc')]
  const borderTime = 1_000
  const timeForNextCheck = 250

  const registry = new promClient.Registry()
  const m = new Metrics(registry)
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  test('should become healthy', async () => {
    const maxCountErrors = 6
    const healthChecker = new HealthChecker(logger, m, borderTime, maxCountErrors)

    // 0 250 500 750 1000 1250 1500 1750 2000 2250
    //                 | <- found 5 errors on  1000-th millisecond
    //                 | found 5 < maxCountErrors = 6 => app is healthy
    // 1  2   3   4    [5]  6     7    8    9   10
    for (let i = 1; i <= 10; i++) {
      await sleep(timeForNextCheck)
      healthChecker.check(networkFindings)
    }

    expect(healthChecker.isHealth()).toBe(true)
  })

  test('should become unhealthy', async () => {
    const maxCountErrors = 5
    const healthChecker = new HealthChecker(logger, m, borderTime, maxCountErrors)

    // 0 250 500 750 1000 1250 1500 1750 2000 2250
    //                 | <- found 5 errors on  1000-th millisecond
    //                 | found 5 === maxCountErrors = 5 => app is unhealthy
    // 1  2   3   4    [5]  6     7    8    9   10
    for (let i = 1; i <= 10; i++) {
      await sleep(timeForNextCheck)
      healthChecker.check(networkFindings)
    }

    expect(healthChecker.isHealth()).toBe(false)
  })

  test('should become unhealthy', async () => {
    const maxCountErrors = 3
    const healthChecker = new HealthChecker(logger, m, borderTime, maxCountErrors)

    // Found per once 3 errors -> app is unhealthy
    const findings3 = [
      networkAlert(new Error('Some err'), 'err name', 'err desc'),
      networkAlert(new Error('Some err'), 'err name', 'err desc'),
      networkAlert(new Error('Some err'), 'err name', 'err desc'),
    ]
    healthChecker.check(findings3)

    expect(healthChecker.isHealth()).toBe(false)
  })
})
