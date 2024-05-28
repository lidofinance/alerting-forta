import BigNumber from 'bignumber.js'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { Logger } from 'winston'
import { Log } from '@ethersproject/abstract-provider'
import * as E from 'fp-ts/Either'
import { BlockDto, WithdrawalRecord } from 'src/entity/blockDto'
import { IMonitorWithdrawalsClient } from '../clients/scroll_client'
import { NetworkError } from '../utils/error'
import { elapsedTime } from '../utils/time'
import { getUniqueKey } from '../utils/finding.helpers'
import { Constants, ETH_DECIMALS } from '../utils/constants'
import { formatAddress } from 'forta-agent/dist/cli/utils'

// 10k wstETH
const MAX_WITHDRAWALS_SUM = 10_000

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string
}
export const HOURS_48 = 60 * 60 * 24 * 2

export class MonitorWithdrawals {
  private readonly name: string = 'WithdrawalsMonitor'

  private readonly withdrawalInitiatedEvent =
    'event WithdrawERC20(address indexed l1Token, address indexed l2Token, address indexed from, uint256 amount, bytes data)'

  private readonly logger: Logger
  private readonly l2Erc20TokenGatewayAddress: string
  private readonly withdrawalsClient: IMonitorWithdrawalsClient

  private withdrawalsStore: WithdrawalRecord[] = []
  private lastReportedTooManyWithdrawalsTimestamp = 0

  constructor(withdrawalsClient: IMonitorWithdrawalsClient, l2Erc20TokenGatewayAddress: string, logger: Logger) {
    this.withdrawalsClient = withdrawalsClient
    this.l2Erc20TokenGatewayAddress = l2Erc20TokenGatewayAddress
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public async initialize(currentBlock: number): Promise<E.Either<NetworkError, MonitorWithdrawalsInitResp>> {
    const pastBlock = currentBlock - Math.ceil(HOURS_48 / Constants.SCROLL_APPROX_BLOCK_TIME_3_SECONDS)

    const withdrawalEvents = await this.withdrawalsClient.getWithdrawalEvents(pastBlock, currentBlock - 1)
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

    this.logger.info(`${MonitorWithdrawals.name} started on block ${currentBlock}`)
    return E.right({
      currentWithdrawals: withdrawalsSum.div(ETH_DECIMALS).toFixed(2),
    })
  }

  public handleBlocks(l2Logs: Log[], l2BlocksDto: BlockDto[]): Finding[] {
    const start = new Date().getTime()

    // adds records into withdrawalsCache
    const withdrawalRecords = this.getWithdrawalRecords(l2Logs, l2BlocksDto)
    if (withdrawalRecords.length !== 0) {
      this.logger.info(`Withdrawals count = ${withdrawalRecords.length}`)
    }
    this.withdrawalsStore.push(...withdrawalRecords)

    const out: Finding[] = []

    for (const l2Block of l2BlocksDto) {
      // remove withdrawals records older than MAX_WITHDRAWALS_WINDOW
      const withdrawalsCache: WithdrawalRecord[] = []
      for (const wc of this.withdrawalsStore) {
        if (wc.time > l2Block.timestamp - HOURS_48) {
          withdrawalsCache.push(wc)
        }
      }

      this.withdrawalsStore = withdrawalsCache

      const withdrawalsSum = new BigNumber(0)
      for (const wc of this.withdrawalsStore) {
        withdrawalsSum.plus(wc.amount)
      }

      // block number condition is meant to "sync" agents alerts
      if (withdrawalsSum.div(ETH_DECIMALS).isGreaterThanOrEqualTo(MAX_WITHDRAWALS_SUM) && l2Block.number % 10 === 0) {
        const period =
          l2Block.timestamp - this.lastReportedTooManyWithdrawalsTimestamp < HOURS_48
            ? l2Block.timestamp - this.lastReportedTooManyWithdrawalsTimestamp
            : HOURS_48

        const uniqueKey = `C167F276-D519-4906-90CB-C4455E9ABBD4`

        const finding: Finding = Finding.fromObject({
          name: `⚠️ Scroll: Huge withdrawals during the last ` + `${Math.floor(period / (60 * 60))} hour(s)`,
          description:
            `There were withdrawals requests from L2 to L1 for the ` +
            `${withdrawalsSum.div(ETH_DECIMALS).toFixed(4)} wstETH in total`,
          alertId: 'HUGE-WITHDRAWALS-FROM-L2',
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          uniqueKey: getUniqueKey(uniqueKey, l2Block.number),
        })

        out.push(finding)

        this.lastReportedTooManyWithdrawalsTimestamp = l2Block.timestamp

        const tmp: WithdrawalRecord[] = []
        for (const wc of this.withdrawalsStore) {
          if (wc.time > l2Block.timestamp - this.lastReportedTooManyWithdrawalsTimestamp) {
            tmp.push(wc)
          }
        }

        this.withdrawalsStore = tmp
      }
    }

    this.logger.info(elapsedTime(MonitorWithdrawals.name + '.' + this.handleBlocks.name, start))
    return out
  }

  private getWithdrawalRecords(l2Logs: Log[], l2BlocksDto: BlockDto[]): WithdrawalRecord[] {
    const blockNumberToBlock = new Map<number, BlockDto>()
    const logIndexToLogs = new Map<number, Log>()
    const addresses = new Set<string>()

    for (const l2Log of l2Logs) {
      logIndexToLogs.set(l2Log.logIndex, l2Log)
      addresses.add(l2Log.address.toLowerCase())
    }

    for (const l2BlockDto of l2BlocksDto) {
      blockNumberToBlock.set(l2BlockDto.number, l2BlockDto)
    }

    const out: WithdrawalRecord[] = []
    if (formatAddress(this.l2Erc20TokenGatewayAddress) in addresses) {
      const events = filterLog(l2Logs, this.withdrawalInitiatedEvent, formatAddress(this.l2Erc20TokenGatewayAddress))

      for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const log: Log = logIndexToLogs.get(event.logIndex)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const blockDto: BlockDto = blockNumberToBlock.get(log.blockNumber)

        out.push({
          time: blockDto.timestamp,
          amount: new BigNumber(String(event.args.amount)),
        })
      }
    }

    return out
  }
}
