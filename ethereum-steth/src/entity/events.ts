import { ethers, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { Log } from '@ethersproject/abstract-provider'
import * as agent_pb from '../generated/proto/agent_pb'
import { TransactionEvent } from '../generated/proto/agent_pb'
import BigNumber from 'bignumber.js'
import { formatAddress } from 'forta-agent/dist/cli/utils'

export type EventOfNotice = {
  name: string
  address: string
  abi: string
  alertId: string
  description: CallableFunction
  severity: FindingSeverity
  type: FindingType
}

export type BlockDto = {
  number: number
  timestamp: number
  parentHash: string
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

export function handleEventsOfNotice(txEvent: TransactionDto, eventsOfNotice: EventOfNotice[]): Finding[] {
  const out: Finding[] = []

  const addresses = new Set<string>()
  for (const eventOfNotice of eventsOfNotice) {
    addresses.add(eventOfNotice.address.toLowerCase())
  }

  for (const log of txEvent.logs) {
    if (addresses.has(log.address.toLowerCase())) {
      for (const eventInfo of eventsOfNotice) {
        const parser = new ethers.utils.Interface([eventInfo.abi])

        try {
          const logDesc = parser.parseLog(log)

          out.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(logDesc.args),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: eventInfo.type,
              metadata: { args: String(logDesc.args) },
            }),
          )
        } catch (e) {
          // Only one from eventsOfNotice could be correct
          // Others - skipping
        }
      }
    }
  }

  return out
}
