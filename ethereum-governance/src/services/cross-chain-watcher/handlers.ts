import * as E from 'fp-ts/Either'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import {
  BRIDGE_ETH_MIN_BALANCE,
  BRIDGE_LINK_MIN_BALANCE,
  BSC_L1_CROSS_CHAIN_CONTROLLER,
  LINK_TOKEN_ADDRESS,
} from '../../shared/constants/cross-chain/mainnet'
import { formatEther } from 'ethers/lib/utils'
import { networkAlert } from '../../shared/errors'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { ICrossChainClient } from './contract'

const BALANCE_CHECK_INTERVAL = 300 // 1 hour ≈ 300 blocks

export async function handleBridgeBalance(ethProvider: ICrossChainClient, event: BlockEvent) {
  if (event.block.number % BALANCE_CHECK_INTERVAL !== 0) {
    return []
  }
  const findings: Finding[] = []
  const ethBalance = await ethProvider.getBalance(BSC_L1_CROSS_CHAIN_CONTROLLER)
  if (E.isLeft(ethBalance)) {
    findings.push(
      networkAlert(
        ethBalance.left,
        'handleBridgeBalance',
        `Error fetching bridge ETH balance on block ${event.block.number}`,
      ),
    )
  }
  if (E.isRight(ethBalance) && ethBalance.right.lt(BigInt(1e18 * BRIDGE_ETH_MIN_BALANCE))) {
    findings.push(
      Finding.fromObject({
        name: '⚠️ Cross-chain bridge ETH balance is low (0.5 ETH min)',
        description: `Bridge balance is low: ${formatEther(ethBalance.right.toString())} ETH`,
        alertId: 'BRIDGE-ETH-BALANCE-LOW',
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
        metadata: { ethBalance: ethBalance.right.toString() },
      }),
    )
  }

  const linkBalance = await ethProvider.getBalance(BSC_L1_CROSS_CHAIN_CONTROLLER, LINK_TOKEN_ADDRESS)
  if (E.isLeft(linkBalance)) {
    findings.push(
      networkAlert(
        linkBalance.left,
        'handleBridgeBalance',
        `Error fetching bridge LINK balance on block ${event.block.number}`,
      ),
    )
  }
  if (E.isRight(linkBalance) && linkBalance.right.lt(BigInt(1e18 * BRIDGE_LINK_MIN_BALANCE))) {
    findings.push(
      Finding.fromObject({
        name: '⚠️ Cross-chain bridge LINK balance is low (5 LINK min)',
        description: `Bridge balance is low: ${formatEther(linkBalance.right.toString())} LINK`,
        alertId: 'BRIDGE-LINK-BALANCE-LOW',
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
        metadata: { linkBalance: linkBalance.right.toString() },
      }),
    )
  }
  return findings
}

export async function handleTransactionForwardingAttempt(txEvent: TransactionEvent, bscAdapters: Map<string, string>) {
  if (!(BSC_L1_CROSS_CHAIN_CONTROLLER in txEvent.addresses)) {
    return []
  }
  const eventSignature =
    'event TransactionForwardingAttempted(bytes32 transactionId, bytes32 indexed envelopeId, bytes encodedTransaction, uint256 destinationChainId, address indexed bridgeAdapter, address destinationBridgeAdapter, bool indexed adapterSuccessful, bytes returnData)'
  const events = txEvent.filterLog(eventSignature, BSC_L1_CROSS_CHAIN_CONTROLLER)

  return events.map((event) => {
    const adapterName = bscAdapters.get(event.args.bridgeAdapter) || event.args.bridgeAdapter + ' adapter'
    const description = `Message was sent from L1 to BSC using ${adapterName} (envelopeId: ${event.args.envelopeId})`

    return Finding.fromObject({
      name: `ℹ️ BNB a.DI: Message sent by the ${adapterName}`,
      description: description,
      alertId: 'L1-BRIDGE-MESSAGE-SENT',
      severity: FindingSeverity.Low,
      type: FindingType.Info,
      metadata: { args: String(event.args) },
    })
  })
}
