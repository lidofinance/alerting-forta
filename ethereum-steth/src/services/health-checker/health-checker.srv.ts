import { Logger } from 'winston'
import { Finding } from '../../generated/proto/alert_pb'
import { BotOutdatedAlertID, NetworkErrorFinding } from '../../utils/errors'
import { Metrics } from '../../utils/metrics/metrics'

export const BorderTime = 15 * 60 * 1000 // 15 minutes
export const MaxNumberErrorsPerBorderTime = 25

export class HealthChecker {
  private errorCount: number
  private isAppOk: boolean
  private readonly borderTime: number
  private readonly maxCountErrors: number

  private errorStartedAt: number | null
  private logger: Logger
  private metrics: Metrics
  private isBotOutdated: boolean

  constructor(logger: Logger, metrics: Metrics, borderTime: number, maxCountErrors: number) {
    this.logger = logger
    this.metrics = metrics

    this.errorCount = 0
    this.errorStartedAt = null
    this.isAppOk = true
    this.borderTime = borderTime
    this.maxCountErrors = maxCountErrors
    this.isBotOutdated = false
  }

  public check(findings: Finding[]): number {
    const currentTime = Date.now()

    let errCount: number = 0
    for (const f of findings) {
      if (f.getAlertid() === NetworkErrorFinding) {
        this.logger.warn(f.getName() + `: ` + f.getMetadataMap()['name'], {
          desc: f.getDescription(),
          msg: f.getMetadataMap()['message'],
          stack: f.getMetadataMap()['stack'],
        })
        errCount += 1

        this.metrics.networkErrors.inc()
      }

      if (f.getAlertid() === BotOutdatedAlertID) {
        this.logger.error(f.getName(), {
          desc: f.getDescription(),
        })

        this.isBotOutdated = true
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
    if (this.isBotOutdated) {
      return false
    }

    return this.isAppOk
  }
}
