import { Finding as FindingProto } from '../generated/proto/alert_pb'

export const NetworkErrorFinding = 'NETWORK-ERROR'

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

export function networkAlert(err: Error, name: string, desc: string): FindingProto {
  const f = new FindingProto()
  f.setName(name)
  f.setDescription(desc)
  f.setAlertid(NetworkErrorFinding)
  f.setSeverity(FindingProto.Severity.UNKNOWN)
  f.setType(FindingProto.FindingType.DEGRADED)
  f.setProtocol('ethereum')

  const m = f.getMetadataMap()
  m.set('stack', `${err.stack}`)
  m.set('message', `${err.message}`)
  m.set('name', `${err.name}`)

  return f
}
