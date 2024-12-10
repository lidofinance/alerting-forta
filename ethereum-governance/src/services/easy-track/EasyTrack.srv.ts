import { ethers, Finding, FindingSeverity, FindingType, getEthersProvider } from 'forta-agent'
import { elapsedTime } from '../../shared/time'
import { etherscanAddress, formatEth, getMotionLink, getMotionType } from '../../shared/string'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'

import { Logger } from 'winston'
import { IEasyTrackClient } from './contract'
import { EventOfNotice } from '../../entity/events'
import { handleEventsOfNotice } from '../../shared/notice'
import {
  EASY_TRACK_ADDRESS,
  EASY_TRACK_STONKS_CONTRACTS,
  EASY_TRACK_TYPES_BY_FACTORIES,
  INCREASE_STAKING_LIMIT_ADDRESS,
  TOP_UP_ALLOWED_RECIPIENTS_CONTRACT,
} from 'constants/easy-track'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../../shared/errors'
import { EASY_TRACK_EVENTS, MOTION_CREATED_EVENT } from '../../shared/events/easytrack_events'
import { TopUpAllowedRecipients__factory } from '../../generated'
import { getMotionCreatorNamedLink, getSafeNameByAddress, getStonksContractInfo } from './utils'

export class EasyTrackSrv {
  private readonly logger: Logger
  private readonly name = 'EasyTrack'
  private readonly ethProvider: IEasyTrackClient

  private readonly easyTrackEvents: EventOfNotice[]

  constructor(logger: Logger, ethProvider: IEasyTrackClient) {
    this.logger = logger
    this.ethProvider = ethProvider
    this.easyTrackEvents = EASY_TRACK_EVENTS
  }

  public initialize(currentBlock: number): null {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
    const findings: Finding[] = []

    const easyTrackFindings = handleEventsOfNotice(txEvent, this.easyTrackEvents)
    const easyTrackMotionFindings = await this.handleEasyTrackMotionCreated(txEvent)

    findings.push(...easyTrackFindings, ...easyTrackMotionFindings)

    return findings
  }

  public async handleEasyTrackMotionCreated(txEvent: TransactionEvent) {
    const out: Finding[] = []
    if (!(EASY_TRACK_ADDRESS in txEvent.addresses)) {
      return out
    }

    const events = txEvent.filterLog(MOTION_CREATED_EVENT, EASY_TRACK_ADDRESS)
    await Promise.all(
      events.map(async (event) => {
        const args = event.args
        let alertName = 'ℹ️ EasyTrack: New motion created'
        let description =
          `${getMotionType(EASY_TRACK_TYPES_BY_FACTORIES, args._evmScriptFactory)} ` +
          `motion ${getMotionLink(args._motionId)} created by ${getMotionCreatorNamedLink(args._creator)}`

        if (args._evmScriptFactory.toLowerCase() == INCREASE_STAKING_LIMIT_ADDRESS) {
          const NOInfo = await this.ethProvider.getNOInfoByMotionData(args._evmScriptCallData)
          if (E.isLeft(NOInfo)) {
            return [
              networkAlert(
                NOInfo.left,
                `Error in ${EasyTrackSrv.name}.${this.handleEasyTrackMotionCreated.name} (uid:10ed392e)`,
                `Could not call ethProvider.getNOInfoByMotionData for name - ${args._evmScriptCallData}`,
              ),
            ]
          }

          const { name, totalSigningKeys, stakingLimit } = NOInfo.right
          description += `\nOperator ${name} wants to increase staking limit to **${stakingLimit.toNumber()}**.`
          if (totalSigningKeys.toNumber() < stakingLimit.toNumber()) {
            alertName = alertName.replace('ℹ', '⚠️')
            description +=
              `\nBut operator has not enough keys uploaded! ⚠️` +
              `\nRequired: ${stakingLimit.toNumber()}` +
              `\nAvailable: ${totalSigningKeys.toNumber()}`
          } else {
            description += `\nNo issues with keys! ✅`
          }
        } else if (EASY_TRACK_STONKS_CONTRACTS.includes(args._evmScriptFactory.toLowerCase())) {
          description += `\n${await buildStonksTopUpDescription(args)}`
        } else if (args._evmScriptFactory.toLowerCase() == TOP_UP_ALLOWED_RECIPIENTS_CONTRACT) {
          const topUpContract = TopUpAllowedRecipients__factory.connect(args._evmScriptFactory, getEthersProvider())
          const tokenAddress = await topUpContract.token()
          const tokenSymbol = await this.ethProvider.getTokenSymbol(tokenAddress)
          if (E.isLeft(tokenSymbol)) {
            return [
              networkAlert(
                tokenSymbol.left,
                `Error in ${EasyTrackSrv.name}.${this.handleEasyTrackMotionCreated.name} (uid:10ed392e)`,
                `Could not call ethProvider.getTokenName for address - ${tokenAddress}`,
              ),
            ]
          }
          const contractPayload = await topUpContract.decodeEVMScriptCallData(args._evmScriptCallData)
          contractPayload.recipients.forEach((recipient: string, idx: number) => {
            const safeName = getSafeNameByAddress(recipient)
            description += `\nTop up allowed recipient ${safeName} for ${etherscanAddress(recipient)} with ${formatEth(
              contractPayload.amounts[idx],
            )} ${tokenSymbol.right}`
          })
        }
        out.push(
          Finding.fromObject({
            name: alertName,
            description: description,
            alertId: 'EASY-TRACK-MOTION-CREATED',
            severity: FindingSeverity.Info,
            type: FindingType.Info,
            metadata: { args: String(args) },
          }),
        )
      }),
    )
    return out
  }
}

export const buildStonksTopUpDescription = async (args: ethers.utils.Result): Promise<string> => {
  const topUpContract = TopUpAllowedRecipients__factory.connect(args._evmScriptFactory, getEthersProvider())
  const { recipients, amounts } = await topUpContract.decodeEVMScriptCallData(args._evmScriptCallData)
  const descriptions = recipients.map((recipient: string, idx: number) => {
    const stonksData = getStonksContractInfo(recipient)
    const amount = formatEth(amounts[idx])
    const etherScanAddress = etherscanAddress(recipient, `${stonksData?.from} -> ${stonksData?.to}`)
    return `${etherScanAddress} pair with ${amount} stETH`
  })
  return `Top up STONKS:\n${descriptions.join('\n')}`
}
