import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime } from '../../shared/time'
import { getMotionLink, getMotionType } from '../../shared/string'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { MOTION_CREATED_EVENT } from '../../shared/events/motion_created_events'
import { Logger } from 'winston'
import { IEasyTrackClient } from './contract'
import { EventOfNotice } from '../../entity/events'
import { handleEventsOfNotice } from '../../shared/notice'
import { EASY_TRACK_ADDRESS, EASY_TRACK_TYPES_BY_FACTORIES, INCREASE_STAKING_LIMIT_ADDRESS } from 'constants/easy-track'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../../shared/errors'
import { EASY_TRACK_EVENTS } from '../../shared/events/easytrack_events'

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
          `motion ${getMotionLink(args._motionId)} created by ${args._creator}`
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
