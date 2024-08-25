import { FindingSeverity, FindingType } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Log } from '@ethersproject/abstract-provider'
import { Finding } from '../generated/proto/alert_pb'
import { TransactionEvent } from '../generated/proto/agent_pb'
// TODO(h): why TransactionEvent is not generated??
import * as agent_pb from '../generated/proto/agent_pb'
import { formatAddress } from 'forta-agent/dist/cli/utils'
import BigNumber from 'bignumber.js'

export type SimulateFunc = (provider: JsonRpcProvider, address: string) => Promise<void>

export type EventOfNotice = {
  name: string
  address: string
  event: string
  alertId: string
  description: CallableFunction
  severity: Finding.Severity
  type: Finding.FindingType
  uniqueKey: string
  simulate?: SimulateFunc
}

export type RpcRequest = {
  jsonrpc: string
  method: string
  params: Array<any>
  id: number
}

export type TransactionDto = {
  logs: Log[]
  to: string | null
  block: {
    timestamp: number
    number: number
  }
}

export function newTransactionDto(request: agent_pb.EvaluateTxRequest): TransactionDto {
  const txEvent = <agent_pb.TransactionEvent>request.getEvent()
  const transaction = <TransactionEvent.EthTransaction>txEvent.getTransaction()
  const logList = <Array<TransactionEvent.Log>>txEvent.getLogsList()
  const block = <TransactionEvent.EthBlock>txEvent.getBlock()

  const logs: Log[] = []
  for (const l of logList) {
    logs.push({
      blockNumber: new BigNumber(l.getBlocknumber(), 10).toNumber(),
      blockHash: l.getTransactionhash(),
      transactionIndex: new BigNumber(l.getTransactionindex(), 10).toNumber(),
      removed: l.getRemoved(),
      address: l.getAddress(),
      data: l.getData(),
      topics: l.getTopicsList(),
      transactionHash: l.getTransactionhash(),
      logIndex: new BigNumber(l.getLogindex(), 10).toNumber(),
    })
  }

  return {
    logs: logs,
    to: transaction.getTo() ? formatAddress(transaction.getTo()) : null,
    block: {
      number: new BigNumber(block.getBlocknumber(), 10).toNumber(),
      timestamp: new BigNumber(block.getBlocktimestamp(), 10).toNumber(),
    },
  }
}
