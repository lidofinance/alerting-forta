import { FindingSeverity, FindingType } from 'forta-agent'

export type EventOfNotice = {
  name: string
  address: string
  event: string
  alertId: string
  description: CallableFunction
  severity: FindingSeverity
  type?: FindingType
  uniqueKey?: string
}
