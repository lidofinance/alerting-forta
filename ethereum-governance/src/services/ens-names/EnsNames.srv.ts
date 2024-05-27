import * as E from 'fp-ts/Either'
import { ENS_CHECK_INTERVAL, LIDO_ENS_NAMES } from 'constants/ens-names'
import { BlockEvent, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { elapsedTime, ONE_WEEK, ONE_MONTH } from '../../shared/time'
import { Logger } from 'winston'
import { networkAlert } from '../../shared/errors'
import type { IEnsNamesClient } from './contract'

export class EnsNamesSrv {
  private readonly logger: Logger
  private readonly name = 'EnsNamesSrv'
  private readonly ethProvider: IEnsNamesClient

  constructor(logger: Logger, ethProvider: IEnsNamesClient) {
    this.logger = logger
    this.ethProvider = ethProvider
  }

  public initialize(currentBlock: number): null {
    const start = new Date().getTime()
    this.logger.info(elapsedTime(`[${this.name}.initialize] on ${currentBlock}`, start))

    return null
  }

  public getName(): string {
    return this.name
  }

  public async handleBlock(blockEvent: BlockEvent) {
    const start = new Date().getTime()
    const findings: Finding[] = []

    const [ensNamesExpirationFindings] = await Promise.all([this.handleEnsNamesExpiration(blockEvent)])

    findings.push(...ensNamesExpirationFindings)

    this.logger.info(elapsedTime(EnsNamesSrv.name + '.' + this.handleBlock.name, start))

    return findings
  }

  public async handleEnsNamesExpiration(blockEvent: BlockEvent): Promise<Finding[]> {
    const out: Finding[] = []
    if (blockEvent.block.number % ENS_CHECK_INTERVAL !== 0) {
      return out
    }

    await Promise.all(
      LIDO_ENS_NAMES.map(async (name) => {
        const expires = await this.ethProvider.getEnsExpiryTimestamp(name)

        if (E.isLeft(expires)) {
          out.push(
            networkAlert(
              expires.left,
              `Error in ${EnsNamesSrv.name}.${this.handleEnsNamesExpiration.name} (uid:88ea9fb0)`,
              `Could not call ethProvider.getEnsExpiryTimestamp for name - ${name}`,
            ),
          )
          return
        }

        const leftSec = expires.right.toNumber() - blockEvent.block.timestamp
        if (leftSec < ONE_MONTH) {
          const left = leftSec > ONE_WEEK * 2 ? 'month' : '2 weeks'
          const severity = leftSec > ONE_WEEK * 2 ? FindingSeverity.High : FindingSeverity.Critical
          out.push(
            Finding.fromObject({
              name: '⚠️ ENS: Domain expires soon',
              description: `Domain rent for ${name}.eth expires in less than a ${left}`,
              alertId: 'ENS-RENT-EXPIRES',
              severity: severity,
              type: FindingType.Info,
            }),
          )
        }
      }),
    )

    return out
  }
}
