import BigNumber from 'bignumber.js'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto, WithdrawalRecord } from '../entity/blockDto'
import { Log } from '@ethersproject/abstract-provider'
import * as E from 'fp-ts/Either'
import { IMonitorWithdrawalsClient } from '../clients/base_client'
import { Logger } from 'winston'
import { dateTimeFormat, elapsedTime } from '../utils/time'
import { getUniqueKey } from '../utils/finding.helpers'

// 12 hours
export const HOURS_12 = 60 * 60 * 12
export const AVG_BLOCK_TIME_2SECONDS: number = 2 //s
const ETH_DECIMALS = new BigNumber(10).pow(18)
// 10k wstETH
const MAX_WITHDRAWALS_10K_WstEth = 10_000

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string
}

export class MonitorWithdrawals {
  private name: string = 'WithdrawalsMonitor'

  private readonly l2Erc20TokenGatewayAddress: string
  private readonly withdrawalInitiatedEvent: string =
    'event WithdrawalInitiated(address indexed _l1Token, address indexed _l2Token, address indexed _from, address _to, uint256 _amount, bytes _data)'

  private readonly logger: Logger
  private readonly withdrawalsClient: IMonitorWithdrawalsClient

  private withdrawalsStore: WithdrawalRecord[] = []
  private manyWithdrawalsTimestamp = 0

  constructor(withdrawalsClient: IMonitorWithdrawalsClient, l2Erc20TokenGatewayAddress: string, logger: Logger) {
    this.withdrawalsClient = withdrawalsClient
    this.l2Erc20TokenGatewayAddress = l2Erc20TokenGatewayAddress
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public async initialize(l2BlockNumber: number): Promise<E.Either<Error, MonitorWithdrawalsInitResp>> {
    // 12 hours
    const pastl2Block = l2BlockNumber - Math.ceil(HOURS_12 / AVG_BLOCK_TIME_2SECONDS)

    const withdrawalEvents = await this.withdrawalsClient.getWithdrawalEvents(pastl2Block, l2BlockNumber - 1)
    if (E.isLeft(withdrawalEvents)) {
      return withdrawalEvents
    }

    const withdrawalRecords = await this.withdrawalsClient.getWithdrawalRecords(withdrawalEvents.right)
    if (E.isLeft(withdrawalRecords)) {
      return withdrawalRecords
    }

    const withdrawalsSum = new BigNumber(0)
    for (const wc of withdrawalRecords.right) {
      withdrawalsSum.plus(wc.amount)
      this.withdrawalsStore.push(wc)
    }

    this.logger.info(`${MonitorWithdrawals.name} started on block ${l2BlockNumber}`)
    return E.right({
      currentWithdrawals: withdrawalsSum.div(ETH_DECIMALS).toFixed(2),
    })
  }

  public handleL2Blocks(l2logs: Log[], l2blocksDto: BlockDto[]): Finding[] {
    const start = new Date().getTime()

    // adds records into withdrawalsCache
    const withdrawalRecords = this.getWithdrawalRecords(l2logs, l2blocksDto)
    if (withdrawalRecords.length !== 0) {
      this.logger.info(`Withdrawals count = ${withdrawalRecords.length}`)
    }
    this.withdrawalsStore.push(...withdrawalRecords)

    const out: Finding[] = []

    for (const l2block of l2blocksDto) {
      // remove withdrawals records older than HOURS_12
      const withdrawalRecords: WithdrawalRecord[] = []
      for (const wc of this.withdrawalsStore) {
        if (l2block.timestamp - HOURS_12 < wc.timestamp) {
          withdrawalRecords.push(wc)
        }
      }

      this.withdrawalsStore = withdrawalRecords

      const withdrawalsSum = new BigNumber(0)
      for (const wc of this.withdrawalsStore) {
        withdrawalsSum.plus(wc.amount)
      }

      // block number condition is meant to "sync" agents alerts
      if (
        withdrawalsSum.dividedBy(ETH_DECIMALS).isGreaterThanOrEqualTo(MAX_WITHDRAWALS_10K_WstEth) &&
        l2block.number % 10 === 0
      ) {
        const period =
          l2block.timestamp - this.manyWithdrawalsTimestamp < HOURS_12
            ? l2block.timestamp - this.manyWithdrawalsTimestamp
            : HOURS_12

        const uniqueKey = '2b55f8b9-c65c-4b91-82cd-d9f6ea426be3'

        const finding: Finding = Finding.fromObject({
          name: `⚠️ Base: Huge withdrawals during the last ` + `${Math.floor(period / (60 * 60))} hour(s)`,
          description:
            `There were withdrawals requests from L2 to L1 for the ` +
            `${withdrawalsSum.dividedBy(ETH_DECIMALS).toFixed(4)} wstETH in total`,
          alertId: 'HUGE-WITHDRAWALS-FROM-L2',
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          uniqueKey: getUniqueKey(uniqueKey, l2block.number),
        })

        out.push(finding)

        this.manyWithdrawalsTimestamp = l2block.timestamp

        const tmp: WithdrawalRecord[] = []
        for (const wc of this.withdrawalsStore) {
          if (l2block.timestamp - this.manyWithdrawalsTimestamp < wc.timestamp) {
            tmp.push(wc)
          }
        }

        this.withdrawalsStore = tmp
      }
    }

    for (const r of withdrawalRecords) {
      this.logger.info(
        r.amount.dividedBy(ETH_DECIMALS).toString() + ' ' + dateTimeFormat.format(new Date(r.timestamp * 1000)),
      )
    }
    this.logger.info(elapsedTime(MonitorWithdrawals.name + '.' + this.handleL2Blocks.name, start))

    return out
  }

  private getWithdrawalRecords(l2logs: Log[], l2blocksDto: BlockDto[]): WithdrawalRecord[] {
    const blockNumberToBlock = new Map<number, BlockDto>()
    const logIndexToLogs = new Map<number, Log>()
    const addresses: string[] = []

    for (const l2log of l2logs) {
      logIndexToLogs.set(l2log.logIndex, l2log)
      addresses.push(l2log.address.toLowerCase())
    }

    for (const l2blockDto of l2blocksDto) {
      blockNumberToBlock.set(l2blockDto.number, l2blockDto)
    }

    const out: WithdrawalRecord[] = []
    if (this.l2Erc20TokenGatewayAddress in addresses) {
      const events = filterLog(l2logs, this.withdrawalInitiatedEvent, this.l2Erc20TokenGatewayAddress.toLowerCase())

      for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const log: Log = logIndexToLogs.get(event.logIndex)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const blockDto: BlockDto = blockNumberToBlock.get(log.blockNumber)

        out.push({
          timestamp: blockDto.timestamp,
          amount: new BigNumber(String(event.args.amount)),
        })
      }
    }

    return out
  }
}
