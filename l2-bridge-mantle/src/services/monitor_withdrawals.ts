import BigNumber from 'bignumber.js'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto, WithdrawalRecord } from '../entity/blockDto'
import { Log } from '@ethersproject/abstract-provider'
import * as E from 'fp-ts/Either'
import { IMonitorWithdrawalsClient } from '../clients/mantle_provider'
import { NetworkError } from '../utils/error'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import { getUniqueKey } from '../utils/finding.helpers'
import { formatAddress } from 'forta-agent/dist/cli/utils'

const ETH_DECIMALS = new BigNumber(10).pow(18)
// 10k wstETH
const MAX_WITHDRAWALS_10K_WstEth = 10_000

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string
}
export const HOURS_48 = 60 * 60 * 24 * 2
export const AVG_BLOCK_TIME_2SECONDS: number = 2 //s

export class MonitorWithdrawals {
  private readonly name: string = 'WithdrawalsMonitor'
  private readonly withdrawalInitiatedEvent =
    'event WithdrawalInitiated(address indexed _l1Token, address indexed _l2Token, address indexed _from, address _to, uint256 _amount, bytes _data)'

  private readonly logger: Logger
  private readonly l2Erc20TokenGatewayAddress: string
  private readonly withdrawalsClient: IMonitorWithdrawalsClient

  private withdrawalStore: WithdrawalRecord[] = []
  private toManyWithdrawalsTimestamp = 0

  constructor(withdrawalsClient: IMonitorWithdrawalsClient, l2Erc20TokenGatewayAddress: string, logger: Logger) {
    this.withdrawalsClient = withdrawalsClient
    this.l2Erc20TokenGatewayAddress = l2Erc20TokenGatewayAddress
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public async initialize(currentBlock: number): Promise<E.Either<NetworkError, MonitorWithdrawalsInitResp>> {
    // TODO: Fix actually on Mantle block time is not constant and the check logic must be updated
    const pastBlock = currentBlock - Math.ceil(HOURS_48 / AVG_BLOCK_TIME_2SECONDS)

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
      this.withdrawalStore.push(wc)
    }

    this.logger.info(`${MonitorWithdrawals.name} started on block ${currentBlock}`)
    return E.right({
      currentWithdrawals: withdrawalsSum.div(ETH_DECIMALS).toFixed(2),
    })
  }

  public handleL2Blocks(l2Logs: Log[], l2BlocksDto: BlockDto[]): Finding[] {
    const start = new Date().getTime()

    // adds records into withdrawalsCache
    const withdrawalRecords = this.getWithdrawalRecords(l2Logs, l2BlocksDto)
    if (withdrawalRecords.length !== 0) {
      this.logger.info(`Withdrawals count = ${withdrawalRecords.length}`)
    }

    this.withdrawalStore.push(...withdrawalRecords)

    const out: Finding[] = []

    for (const l2block of l2BlocksDto) {
      // remove withdrawals records older than MAX_WITHDRAWALS_WINDOW
      const withdrawalsCache: WithdrawalRecord[] = []
      for (const wc of this.withdrawalStore) {
        if (l2block.timestamp - HOURS_48 < wc.timestamp) {
          withdrawalsCache.push(wc)
        }
      }

      this.withdrawalStore = withdrawalsCache

      const withdrawalsSum = new BigNumber(0)
      for (const wc of this.withdrawalStore) {
        withdrawalsSum.plus(wc.amount)
      }

      // block number condition is meant to "sync" agents alerts
      if (
        withdrawalsSum.div(ETH_DECIMALS).isGreaterThanOrEqualTo(MAX_WITHDRAWALS_10K_WstEth) &&
        l2block.number % 10 === 0
      ) {
        const period =
          l2block.timestamp - this.toManyWithdrawalsTimestamp < HOURS_48
            ? l2block.timestamp - this.toManyWithdrawalsTimestamp
            : HOURS_48

        const uniqueKey: string = `2aba9cff-a81f-4069-8e64-32ec9473e7b9`

        const finding: Finding = Finding.fromObject({
          name: `⚠️ Mantle: Huge withdrawals during the last ` + `${Math.floor(period / (60 * 60))} hour(s)`,
          description:
            `There were withdrawals requests from L2 to L1 for the ` +
            `${withdrawalsSum.div(ETH_DECIMALS).toFixed(4)} wstETH in total`,
          alertId: 'HUGE-WITHDRAWALS-FROM-L2',
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          uniqueKey: getUniqueKey(uniqueKey, l2block.number),
        })

        out.push(finding)

        this.toManyWithdrawalsTimestamp = l2block.timestamp

        const tmp: WithdrawalRecord[] = []
        for (const wc of this.withdrawalStore) {
          if (l2block.timestamp - this.toManyWithdrawalsTimestamp < wc.timestamp) {
            tmp.push(wc)
          }
        }

        this.withdrawalStore = tmp
      }
    }

    this.logger.info(elapsedTime(MonitorWithdrawals.name + '.' + this.handleL2Blocks.name, start))
    return out
  }

  private getWithdrawalRecords(logs: Log[], blocksDto: BlockDto[]): WithdrawalRecord[] {
    const blockNumberToBlock = new Map<number, BlockDto>()
    const logIndexToLogs = new Map<number, Log>()
    const addresses: string[] = []

    for (const log of logs) {
      logIndexToLogs.set(log.logIndex, log)
      addresses.push(formatAddress(log.address))
    }

    for (const blockDto of blocksDto) {
      blockNumberToBlock.set(blockDto.number, blockDto)
    }

    const out: WithdrawalRecord[] = []
    if (this.l2Erc20TokenGatewayAddress in addresses) {
      const events = filterLog(logs, this.withdrawalInitiatedEvent, formatAddress(this.l2Erc20TokenGatewayAddress))

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
