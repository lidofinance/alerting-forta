import { Finding } from 'forta-agent'
import { NetworkErrorFinding } from '../../utils/errors'

export const BorderTime = 15 * 60 * 1000 // 15 minutes
export const MaxNumberErrorsPerBorderTime = 25

export class HealthChecker {
  private errorCount: number
  private isAppOk: boolean
  private readonly borderTime: number
  private readonly maxCountErrors: number

  private errorStartedAt: number | null

  constructor(borderTime: number, maxCountErrors: number) {
    this.errorCount = 0
    this.errorStartedAt = null
    this.isAppOk = true
    this.borderTime = borderTime
    this.maxCountErrors = maxCountErrors
  }

  public check(findings: Finding[]): void {
    const currentTime = Date.now()

    let errCount: number = 0
    for (const f of findings) {
      if (f.alertId === NetworkErrorFinding) {
        errCount += 1
      }
    }

    // if for one iteration we have more than maxCountErrors
    // then app is unhealthy
    if (errCount >= this.maxCountErrors) {
      this.isAppOk = false
      return
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
  }

  public isHealth(): boolean {
    return this.isAppOk
  }
}
