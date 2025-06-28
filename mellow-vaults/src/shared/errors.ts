import { Finding, FindingSeverity, FindingType } from 'forta-agent'

export const NetworkErrorFinding = 'NETWORK-ERROR'

export function networkAlert(err: Error, name: string, desc: string): Finding {
  return Finding.fromObject({
    name: name,
    description: desc,
    alertId: NetworkErrorFinding,
    severity: FindingSeverity.Unknown,
    type: FindingType.Degraded,
    metadata: {
      stack: `${err.stack}`,
      message: `${err.message}`,
      name: `${err.name}`,
    },
  })
}

export class NetworkError extends Error {
  constructor(e: unknown, name?: string) {
    super()

    if (name !== undefined) {
      this.name = name
    }

    if (e instanceof Error) {
      this.stack = e.stack
      this.message = e.message
      this.cause = e.cause
    } else {
      this.message = `${e}`
    }
  }
}
