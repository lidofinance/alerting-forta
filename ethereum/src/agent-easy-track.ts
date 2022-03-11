import BigNumber from 'bignumber.js'

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from 'forta-agent'

import {Event} from 'ethers'


import {
  EASY_TRACK_EVENTS_OF_NOTICE,
} from './constants'


export const name = 'EasyTrack'


export async function initialize(currentBlock: number): Promise<{[key: string]: string}> {
  console.log(`[${name}]`)
  return {}
}


export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = []

  handleEasyTrackTransaction(txEvent, findings)

  return findings
}

function handleEasyTrackTransaction(txEvent: TransactionEvent, findings: Finding[]) {
  EASY_TRACK_EVENTS_OF_NOTICE.forEach(eventInfo => {
    if (txEvent.to === eventInfo.address) {
      const [event] = txEvent.filterLog(eventInfo.event, eventInfo.address)
      if (event) {
        findings.push(Finding.fromObject({
          name: event.name,
          description: eventInfo.description(event.args),
          alertId: eventInfo.alertId,
          severity: eventInfo.severity,
          type: FindingType.Info,
          metadata: { args: String(event.args) },
        }))
      }
    }
  }
  )
}
