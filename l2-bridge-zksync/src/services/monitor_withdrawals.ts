import BigNumber from 'bignumber.js'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto, WithdrawalRecord } from '../entity/blockDto'
import { Log } from '@ethersproject/abstract-provider'
import * as E from 'fp-ts/Either'
import { IMonitorWithdrawalsClient } from '../clients/zksync_client'
import { NetworkError } from '../utils/error'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import { getUniqueKey } from '../utils/finding.helpers'
import { ETH_DECIMALS } from '../utils/constants'

// 10k wstETH
const MAX_WITHDRAWALS_10K_WstEth = 10_000

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string
}
const L2_BLOCKS_PER_2_DAYS = 172_800
const HOURS_48 = 60 * 60 * 24 * 2

export class MonitorWithdrawals {
  private readonly name: string = 'WithdrawalsMonitor'
  private readonly withdrawalInitiatedEvent =
    'event WithdrawalInitiated(address indexed l2Sender, address indexed l1Receiver, address indexed l2Token, uint256 amount)'

  private readonly logger: Logger
  private readonly l2Erc20TokenGatewayAddress: string
  private readonly withdrawalsClient: IMonitorWithdrawalsClient

  private withdrawalsStore: WithdrawalRecord[] = []
  private lastReportedToManyWithdrawals = 0

  constructor(withdrawalsClient: IMonitorWithdrawalsClient, l2Erc20TokenGatewayAddress: string, logger: Logger) {
    this.withdrawalsClient = withdrawalsClient
    this.l2Erc20TokenGatewayAddress = l2Erc20TokenGatewayAddress
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public async initialize(latestL2BlockNumber: number): Promise<E.Either<NetworkError, MonitorWithdrawalsInitResp>> {
    // 48 hours
    const pastBlock = latestL2BlockNumber - L2_BLOCKS_PER_2_DAYS

    const withdrawalEvents = await this.withdrawalsClient.getWithdrawalEvents(pastBlock, latestL2BlockNumber - 1)
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

    this.logger.info(`${MonitorWithdrawals.name} started on block ${latestL2BlockNumber}`)
    return E.right({
      currentWithdrawals: withdrawalsSum.div(ETH_DECIMALS).toFixed(2),
    })
  }

  public handleBlocks(l2Logs: Log[], L2BlocksDto: BlockDto[]): Finding[] {
    const start = new Date().getTime()

    // adds records into withdrawalsCache
    const withdrawalRecords = this.getWithdrawalRecords(l2Logs, L2BlocksDto)
    if (withdrawalRecords.length !== 0) {
      this.logger.info(`Withdrawals count = ${withdrawalRecords.length}`)
    }

    this.withdrawalsStore.push(...withdrawalRecords)

    const out: Finding[] = []

    for (const l2Block of L2BlocksDto) {
      // remove withdrawals records older than MAX_WITHDRAWALS_WINDOW
      const withdrawalsCache: WithdrawalRecord[] = []
      for (const wc of this.withdrawalsStore) {
        if (l2Block.timestamp - HOURS_48 < wc.timestamp) {
          withdrawalsCache.push(wc)
        }
      }

      this.withdrawalsStore = withdrawalsCache

      const withdrawalsSum = new BigNumber(0)
      for (const wc of this.withdrawalsStore) {
        withdrawalsSum.plus(wc.amount)
      }

      // block number condition is meant to "sync" agents alerts
      if (
        withdrawalsSum.div(ETH_DECIMALS).isGreaterThanOrEqualTo(MAX_WITHDRAWALS_10K_WstEth) &&
        l2Block.number % 10 === 0
      ) {
        const period =
          l2Block.timestamp - this.lastReportedToManyWithdrawals < HOURS_48
            ? l2Block.timestamp - this.lastReportedToManyWithdrawals
            : HOURS_48

        const uniqueKey: string = `82fd9b59-0cb2-42bd-b660-1c01bc18bfd2`

        const finding: Finding = Finding.fromObject({
          name: `⚠️ ZkSync: Huge withdrawals during the last ` + `${Math.floor(period / (60 * 60))} hour(s)`,
          description:
            `There were withdrawals requests from L2 to L1 for the ` +
            `${withdrawalsSum.div(ETH_DECIMALS).toFixed(4)} wstETH in total`,
          alertId: 'HUGE-WITHDRAWALS-FROM-L2',
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          uniqueKey: getUniqueKey(uniqueKey, l2Block.number),
        })

        out.push(finding)

        this.lastReportedToManyWithdrawals = l2Block.timestamp

        const tmp: WithdrawalRecord[] = []
        for (const wc of this.withdrawalsStore) {
          if (l2Block.timestamp - this.lastReportedToManyWithdrawals < wc.timestamp) {
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

    if (this.l2Erc20TokenGatewayAddress.toLowerCase() in addresses) {
      const events = filterLog(l2Logs, this.withdrawalInitiatedEvent, this.l2Erc20TokenGatewayAddress.toLowerCase())

      for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const log: Log = logIndexToLogs.get(event.logIndex)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const blockDto: BlockDto = blockNumberToBlock.get(new BigNumber(log.blockNumber, 10).toNumber())

        out.push({
          timestamp: blockDto.timestamp,
          amount: new BigNumber(String(event.args.amount)),
        })
      }
    }

    return out
  }
}
