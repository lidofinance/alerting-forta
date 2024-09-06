import { FindingSeverity, FindingType } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'

export type SimulateFunc = (provider: JsonRpcProvider, address: string) => Promise<void>

export type EventOfNotice = {
  name: string
  address: string
  event: string
  alertId: string
  description: CallableFunction
  severity: FindingSeverity
  type: FindingType
  uniqueKey: string
  simulate?: SimulateFunc,
}
