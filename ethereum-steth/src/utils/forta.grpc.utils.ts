import { formatAddress, isZeroAddress } from 'forta-agent/dist/cli/utils'
import * as agent_pb from '../proto/agent_pb'
import { BlockEvent, TransactionEvent } from '../proto/agent_pb'
import * as alert_pb from '../proto/alert_pb'
import { BlockEvent as FortaBlockEvent, Finding, TransactionEvent as FortaTxEvent } from 'forta-agent'
import { EventType } from 'forta-agent/dist/sdk/event.type'
import { getContractAddress } from 'ethers/lib/utils'

export function createBlockEventFromGrpcRequest(request: agent_pb.EvaluateBlockRequest): FortaBlockEvent {
  const blockEvent = <agent_pb.BlockEvent>request.getEvent()
  const block: agent_pb.BlockEvent.EthBlock = <agent_pb.BlockEvent.EthBlock>blockEvent.getBlock()

  const blok = {
    difficulty: block.getDifficulty(),
    extraData: block.getExtradata(),
    gasLimit: block.getGaslimit(),
    gasUsed: block.getGasused(),
    hash: block.getHash(),
    logsBloom: block.getLogsbloom(),
    miner: formatAddress(block.getMiner()),
    mixHash: block.getMixhash(),
    nonce: block.getNonce(),
    number: parseInt(block.getNumber()),
    parentHash: block.getParenthash(),
    receiptsRoot: block.getReceiptsroot(),
    sha3Uncles: block.getSha3uncles(),
    size: block.getSize(),
    stateRoot: block.getStateroot(),
    timestamp: parseInt(block.getTimestamp()),
    totalDifficulty: block.getTotaldifficulty(),
    transactions: block.getTransactionsList(),
    transactionsRoot: block.getTransactionsroot(),
    uncles: block.getUnclesList(),
  }

  const network = <agent_pb.BlockEvent.Network>blockEvent.getNetwork()

  return new FortaBlockEvent(blockEvent.getType(), parseInt(network.getChainid()), blok)
}

export function fortaFindingToGrpc(finding: Finding): alert_pb.Finding {
  const out: alert_pb.Finding = new alert_pb.Finding()

  out.setProtocol(finding.protocol)
  out.setSeverity(Number(finding.severity))
  out.setType(Number(finding.type))
  out.setAlertid(finding.alertId)
  out.setName(finding.name)
  out.setDescription(finding.description)
  out.setPrivate(false)
  out.setAddressesList(finding.addresses)
  out.setUniquekey(finding.uniqueKey)
  out.setTimestamp(finding.timestamp.toString())

  const metadata = out.getMetadataMap()
  for (const key in finding.metadata) {
    metadata.set(key, finding.metadata[key])
  }

  return out
}

export function createTransactionEventFromGrpcRequest(request: agent_pb.EvaluateTxRequest): FortaTxEvent {
  const txEvent = <agent_pb.TransactionEvent>request.getEvent()
  const type: EventType = txEvent.getType()
  const network = <BlockEvent.Network>txEvent.getNetwork()
  const transaction = <TransactionEvent.EthTransaction>txEvent.getTransaction()
  const logList = <Array<TransactionEvent.Log>>txEvent.getLogsList()
  const block = <TransactionEvent.EthBlock>txEvent.getBlock()
  const tracesList = txEvent.getTracesList()

  const tx = {
    hash: transaction.getHash(),
    from: formatAddress(transaction.getFrom()),
    to: transaction.getTo() ? formatAddress(transaction.getTo()) : null,
    nonce: parseInt(transaction.getNonce()),
    gas: transaction.getGas(),
    gasPrice: transaction.getGasprice(),
    value: transaction.getValue(),
    data: transaction.getInput(),
    r: transaction.getR(),
    s: transaction.getS(),
    v: transaction.getV(),
  }
  const addresses = {
    [tx.from]: true,
  }
  if (tx.to) {
    addresses[tx.to] = true
  }

  const traces = []
  for (const trace of tracesList) {
    const action = <TransactionEvent.TraceAction>trace.getAction()
    const result = trace.getResult()

    traces.push({
      action: {
        callType: action.getCalltype(),
        to: formatAddress(action.getTo()),
        input: action.getInput(),
        from: formatAddress(action.getFrom()),
        value: action.getValue(),
        init: action.getInit(),
        address: formatAddress(action.getAddress()),
        balance: action.getBalance(),
        refundAddress: formatAddress(action.getRefundaddress()),
      },
      blockHash: trace.getBlockhash(),
      blockNumber: trace.getBlocknumber(),
      result: {
        gasUsed: result !== undefined ? result.getGasused() : '',
        address: result !== undefined ? result.getAddress() : '',
        code: result !== undefined ? result.getCode() : '',
        output: result !== undefined ? result.getOutput() : '',
      },
      subtraces: trace.getSubtraces(),
      traceAddress: trace.getTraceaddressList(),
      transactionHash: trace.getTransactionhash(),
      transactionPosition: trace.getTransactionposition(),
      type: trace.getType(),
      error: trace.getError(),
    })
  }

  const logs = logList.map((log) => {
    const address = formatAddress(log.getAddress())
    addresses[address] = true

    return {
      address: address,
      topics: log.getTopicsList(),
      data: log.getData(),
      logIndex: parseInt(log.getLogindex()),
      blockNumber: parseInt(log.getBlocknumber()),
      blockHash: log.getBlockhash(),
      transactionIndex: parseInt(log.getTransactionindex()),
      transactionHash: log.getTransactionhash(),
      removed: log.getRemoved(),
    }
  })

  let contractAddress = null
  if (isZeroAddress(transaction.getTo())) {
    contractAddress = formatAddress(getContractAddress({ from: transaction.getFrom(), nonce: transaction.getNonce() }))
  }

  return new FortaTxEvent(
    type,
    parseInt(network.getChainid()),
    tx,
    traces,
    addresses,
    {
      hash: block.getBlockhash(),
      number: parseInt(block.getBlocknumber()),
      timestamp: parseInt(block.getBlocknumber()),
    },
    logs,
    contractAddress,
  )
}
