import { TransactionEvent, Finding, FindingType } from 'forta-agent'

import { Blockchain, GNOSIS_SAFE_EVENTS_OF_NOTICE, SAFES, SafeTX } from './constants'

export const name = 'Ethereum-multisig-watcher'

const blockchain = Blockchain.ETH
const safes = SAFES[blockchain]

export async function initialize(currentBlock: number): Promise<{ [key: string]: string }> {
  console.log(`[${name}] initialized on block ${currentBlock}`)

  return {}
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = []

  handleSafeEvents(txEvent, findings)

  return findings
}

function handleSafeEvents(txEvent: TransactionEvent, findings: Finding[]) {
  safes.forEach(([safeAddress, safeName]) => {
    if (safeAddress in txEvent.addresses) {
      GNOSIS_SAFE_EVENTS_OF_NOTICE.forEach((eventInfo) => {
        const events = txEvent.filterLog(eventInfo.event, safeAddress)
        events.forEach((event) => {
          const safeTx: SafeTX = {
            tx: txEvent.transaction.hash,
            safeAddress: safeAddress,
            safeName: safeName,
            safeTx: event.args.txHash || '',
            blockchain: blockchain,
          }
          findings.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(safeTx, event.args),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: FindingType.Info,
              metadata: { args: String(event.args) },
            }),
          )
        })
      })
    }
  })
}
