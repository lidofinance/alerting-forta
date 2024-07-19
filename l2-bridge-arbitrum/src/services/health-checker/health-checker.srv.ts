import { NetworkErrorFinding } from '../../utils/errors'
import { Finding } from '../../generated/proto/alert_pb'
import { Logger } from 'winston'
import { Metrics } from '../../utils/metrics/metrics'

export const BorderTime = 15 * 60 * 1000 // 15 minutes
export const MaxNumberErrorsPerBorderTime = 5_000

export class HealthChecker {
  private errorCount: number
  private isAppOk: boolean
  private readonly borderTime: number
  private readonly maxCountErrors: number

  private errorStartedAt: number | null
  private logger: Logger
  private metrics: Metrics

  constructor(logger: Logger, metrics: Metrics, borderTime: number, maxCountErrors: number) {
    this.logger = logger
    this.metrics = metrics

    this.errorCount = 0
    this.errorStartedAt = null
    this.isAppOk = true
    this.borderTime = borderTime
    this.maxCountErrors = maxCountErrors
  }

  public check(findings: Finding[]): number {
    const currentTime = Date.now()

    let errCount: number = 0
    for (const f of findings) {
      if (f.getAlertid() === NetworkErrorFinding) {
        this.logger.warn(f.getName(), {
          desc: f.getDescription(),
          stack: f.getMetadataMap()['stack'],
          msg: f.getMetadataMap()['message'],
          err: f.getMetadataMap()['name'],
        })
        errCount += 1

        this.metrics.networkErrors.inc()
      }
    }

    // if for one iteration we have more than maxCountErrors
    // then app is unhealthy
    if (errCount >= this.maxCountErrors) {
      this.isAppOk = false
      return errCount
    }

    if (this.errorStartedAt === null && errCount > 0) {
      this.errorStartedAt = currentTime
    }

    this.errorCount += errCount

    if (this.errorStartedAt !== null && currentTime - this.errorStartedAt >= this.borderTime) {
      if (this.errorCount >= this.maxCountErrors) {
        this.isAppOk = false
      } else {
        this.errorCount = 0
        this.errorStartedAt = null
      }
    }

    return errCount
  }

  public isHealth(): boolean {
    return this.isAppOk
  }
}
