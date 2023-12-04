import { Finding, FindingSeverity, FindingType } from 'forta-agent'

export function errorToFinding(e: unknown, className: string, fnName: string): Finding {
  const err: Error = e instanceof Error ? e : new Error(`non-Error thrown: ${e}`)

  return Finding.fromObject({
    name: `Error in ${className}.${fnName}`,
    description: `${err}`,
    alertId: 'LIDO-AGENT-ERROR',
    severity: FindingSeverity.High,
    type: FindingType.Degraded,
    metadata: { stack: `${err.stack}` },
  })
}
