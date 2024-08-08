import { BlockEvent, ethers, Finding, FindingSeverity, FindingType, getEthersProvider } from 'forta-agent'
import {
  BRIDGE_ETH_MIN_BALANCE,
  BRIDGE_LINK_MIN_BALANCE,
  BSC_L1_CROSS_CHAIN_CONTROLLER,
  LINK_TOKEN_ADDRESS,
} from '../../shared/constants/cross-chain/mainnet'
import { formatEther } from 'ethers/lib/utils'
import { networkAlert } from '../../shared/errors'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'

const BALANCE_CHECK_INTERVAL = 300 // 1 hour ≈ 300 blocks

export async function handleBridgeBalance(event: BlockEvent) {
  if (event.block.number % BALANCE_CHECK_INTERVAL !== 0) {
    return []
  }
  const findings: Finding[] = []

  const provider = getEthersProvider()

  try {
    const ethBalance = await provider.getBalance(BSC_L1_CROSS_CHAIN_CONTROLLER)
    if (ethBalance.lt(BigInt(1e18 * BRIDGE_ETH_MIN_BALANCE))) {
      findings.push(
        Finding.fromObject({
          name: '⚠️ Cross-chain bridge ETH balance is low (0.5 ETH min)',
          description: `Bridge balance is low: ${formatEther(ethBalance.toString())} ETH`,
          alertId: 'BRIDGE-ETH-BALANCE-LOW',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: { ethBalance: ethBalance.toString() },
        }),
      )
    }
  } catch (err: unknown) {
    findings.push(
      networkAlert(
        err as Error,
        'handleBridgeBalance',
        `Error fetching bridge ETH balance on block ${event.block.number}`,
      ),
    )
  }

  const linkContract = new ethers.Contract(
    LINK_TOKEN_ADDRESS,
    ['function balanceOf(address) returns (uint256)'],
    provider,
  )

  try {
    const linkBalance = (await linkContract.balanceOf(BSC_L1_CROSS_CHAIN_CONTROLLER)) as ethers.BigNumber

    if (linkBalance.lt(BigInt(1e18 * BRIDGE_LINK_MIN_BALANCE))) {
      findings.push(
        Finding.fromObject({
          name: '⚠️ Cross-chain bridge LINK balance is low (5 LINK min)',
          description: `Bridge balance is low: ${formatEther(linkBalance.toString())} LINK`,
          alertId: 'BRIDGE-LINK-BALANCE-LOW',
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: { linkBalance: linkBalance.toString() },
        }),
      )
    }
  } catch (err: unknown) {
    findings.push(
      networkAlert(
        err as Error,
        'handleBridgeBalance',
        `Error fetching bridge LINK balance on block ${event.block.number}`,
      ),
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
