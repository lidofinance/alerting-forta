import { Finding } from '../generated/proto/alert_pb'

export type EventOfNotice = {
  name: string
  address: string
  event: string
  alertId: string
  description: CallableFunction
  severity: Finding.Severity
  type: Finding.FindingType
}

export type Metadata = { [key: string]: string }

export type RpcRequest = {
  jsonrpc: string
  method: string
  params: Array<any>
  id: number
}
