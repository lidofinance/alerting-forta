import { Log } from '@ethersproject/abstract-provider'
import BigNumber from 'bignumber.js'
import * as agent_pb from '../generated/proto/agent_pb'
import { TransactionEvent } from '../generated/proto/agent_pb'
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
    to: transaction.getTo() ? transaction.getTo().toLowerCase() : null,
    block: {
      number: new BigNumber(block.getBlocknumber(), 10).toNumber(),
      timestamp: new BigNumber(block.getBlocktimestamp(), 10).toNumber(),
    },
  }
}
