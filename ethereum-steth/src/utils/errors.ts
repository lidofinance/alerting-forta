import { Finding } from '../generated/proto/alert_pb'

export const NetworkErrorFinding = 'NETWORK-ERROR'
export const BotOutdatedAlertID = 'L1-BLOCK-OUTDATED'

export function networkAlert(err: Error, name: string, desc: string): Finding {
  const f: Finding = new Finding()
  f.setName(name)
  f.setDescription(desc)
  f.setAlertid(NetworkErrorFinding)
  f.setSeverity(Finding.Severity.UNKNOWN)
  f.setType(Finding.FindingType.DEGRADED)
  f.setProtocol('ethereum')

  const m = f.getMetadataMap()
  m.set('stack', `${err.stack}`)
  m.set('message', `${err.message}`)
  m.set('name', `${err.name}`)

  return f
}

export function dbAlert(err: Error, name: string, desc: string): Finding {
  const f: Finding = new Finding()
  f.setName(name)
  f.setDescription(desc)
  f.setAlertid('DB-ERROR')
  f.setSeverity(Finding.Severity.UNKNOWN)
  f.setType(Finding.FindingType.DEGRADED)
  f.setProtocol('ethereum')

  const m = f.getMetadataMap()
  m.set('stack', `${err.stack}`)
  m.set('message', `${err.message}`)
  m.set('name', `${err.name}`)

  return f
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
