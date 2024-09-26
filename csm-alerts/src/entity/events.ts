import { Log } from '@ethersproject/abstract-provider'
import * as agent_pb from '../generated/proto/agent_pb'
import { TransactionEvent } from '../generated/proto/agent_pb'
import BigNumber from 'bignumber.js'
import { formatAddress } from 'forta-agent/dist/cli/utils'
import { Finding } from '../generated/proto/alert_pb'
import { ethers } from 'ethers'

export type EventOfNotice = {
  name: string
  address: string
  abi: string
  alertId: string
  description: CallableFunction
  severity: Finding.Severity
  type: Finding.FindingType
}

export type BlockDto = {
  number: number
  timestamp: number
  parentHash: string
  hash: string
}

export type TransactionDto = {
  logs: Log[]
  to: string | null
  block: {
    timestamp: number
    number: number
  }
  hash: string
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
    hash: transaction.getHash(),
  }
}

export function handleEventsOfNotice(txEvent: TransactionDto, eventsOfNotice: EventOfNotice[]): Finding[] {
  const out: Finding[] = []

  const addresses = new Set(eventsOfNotice.map((event) => event.address.toLowerCase()))

  for (const log of txEvent.logs) {
    if (addresses.has(log.address.toLowerCase())) {
      for (const eventInfo of eventsOfNotice) {
        const parser = new ethers.utils.Interface([eventInfo.abi])

        try {
          const logDesc = parser.parseLog(log)
          const f: Finding = new Finding()

          f.setName(eventInfo.name)
          f.setDescription(eventInfo.description(logDesc.args))
          f.setAlertid(eventInfo.alertId)
          f.setSeverity(eventInfo.severity)
          f.setType(eventInfo.type)
          f.setProtocol('ethereum')
          const m = f.getMetadataMap()
          m.set('args', String(logDesc.args))

          out.push(f)
        } catch (e) {
          // Only one from eventsOfNotice could be correct
          // Others - skipping
        }
      }
    }
  }

  return out
}
