import { L2Bridge } from '../generated'
import BigNumber from 'bignumber.js'
import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto } from 'src/entity/blockDto'
import { Block, Log } from '@ethersproject/abstract-provider'
import { TransactionEventHelper } from '../utils/transaction_event'
import * as E from 'fp-ts/Either'
import { WithdrawalInitiatedEvent } from '../generated/L2Bridge'

// 48 hours
const MAX_WITHDRAWALS_WINDOW = 60 * 60 * 24 * 2
const ETH_DECIMALS = new BigNumber(10).pow(18)
// 10k wstETH
const MAX_WITHDRAWALS_SUM = 10000

type IWithdrawalRecord = {
  time: number
  amount: BigNumber
}

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string
}

export class MonitorWithdrawals {
  private name: string = 'WithdrawalsMonitor'

  private readonly l2Erc20TokenGatewayAddress: string
  private readonly withdrawalInitiatedEvent: string
  private readonly l2Bridge: L2Bridge

  private withdrawalsCache: IWithdrawalRecord[] = []
  private lastReportedToManyWithdrawals = 0

  constructor(
    l2Bridge: L2Bridge,
    l2Erc20TokenGatewayAddress: string,
    withdrawalInitiatedEvent: string,
  ) {
    this.l2Bridge = l2Bridge
    this.l2Erc20TokenGatewayAddress = l2Erc20TokenGatewayAddress
    this.withdrawalInitiatedEvent = withdrawalInitiatedEvent
  }

  public getName(): string {
    return this.name
  }

  public async initialize(
    currentBlock: number,
  ): Promise<E.Either<Error, MonitorWithdrawalsInitResp>> {
    console.log('[' + this.name + ']')

    const withdrawalInitiatedFilter =
      this.l2Bridge.filters.WithdrawalInitiated()

    const pastBlock = currentBlock - Math.ceil(MAX_WITHDRAWALS_WINDOW / 13)

    let withdrawEvents: WithdrawalInitiatedEvent[] = []
    try {
      withdrawEvents = await this.l2Bridge.queryFilter(
        withdrawalInitiatedFilter,
        pastBlock,
        currentBlock - 1,
      )
    } catch (e) {
      return E.left(new Error(`Could not fetch withdrawEvents. cause: ${e}`))
    }

    for (const withdrawEvent of withdrawEvents) {
      if (withdrawEvent.args) {
        let block: Block
        try {
          block = await withdrawEvent.getBlock()
        } catch (e) {
          return E.left(
            new Error(`Could not fetch block from withdrawEvent. cause: ${e}`),
          )
        }

        const record: IWithdrawalRecord = {
          time: block.timestamp,
          amount: new BigNumber(String(withdrawEvent.args.amount)),
        }

        this.withdrawalsCache.push(record)
      }
    }

    const withdrawalsSum = new BigNumber(0)
    for (const wc of this.withdrawalsCache) {
      withdrawalsSum.plus(wc.amount)
    }

    return E.right({
      currentWithdrawals: withdrawalsSum.div(ETH_DECIMALS).toFixed(2),
    })
  }

  public handleBlocks(blocksDto: BlockDto[]): Finding[] {
    const out: Finding[] = []

    for (const block of blocksDto) {
      // remove withdrawals records older than MAX_WITHDRAWALS_WINDOW
      const withdrawalsCache: IWithdrawalRecord[] = []
      for (const wc of this.withdrawalsCache) {
        if (wc.time > block.timestamp - MAX_WITHDRAWALS_WINDOW) {
          withdrawalsCache.push(wc)
        }
      }

      this.withdrawalsCache = withdrawalsCache

      const withdrawalsSum = new BigNumber(0)
      for (const wc of this.withdrawalsCache) {
        withdrawalsSum.plus(wc.amount)
      }

      // block number condition is meant to "sync" agents alerts
      if (
        withdrawalsSum
          .div(ETH_DECIMALS)
          .isGreaterThanOrEqualTo(MAX_WITHDRAWALS_SUM) &&
        block.number % 10 === 0
      ) {
        const period =
          block.timestamp - this.lastReportedToManyWithdrawals <
          MAX_WITHDRAWALS_WINDOW
            ? block.timestamp - this.lastReportedToManyWithdrawals
            : MAX_WITHDRAWALS_WINDOW

        const finding: Finding = Finding.fromObject({
          name:
            `⚠️ Base: Huge withdrawals during the last ` +
            `${Math.floor(period / (60 * 60))} hour(s)`,
          description:
            `There were withdrawals requests from L2 to L1 for the ` +
            `${withdrawalsSum.div(ETH_DECIMALS).toFixed(4)} wstETH in total`,
          alertId: 'HUGE-WITHDRAWALS-FROM-L2',
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })

        out.push(finding)

        this.lastReportedToManyWithdrawals = block.timestamp

        const tmp: IWithdrawalRecord[] = []
        for (const wc of this.withdrawalsCache) {
          if (wc.time > block.timestamp - this.lastReportedToManyWithdrawals) {
            tmp.push(wc)
          }
        }

        this.withdrawalsCache = tmp
      }
    }

    return out
  }

  public handleWithdrawalEvent(logs: Log[], blocksDto: BlockDto[]): void {
    const blockNumberToBlock = new Map<number, BlockDto>()
    const logIndexToLogs = new Map<number, Log>()
    const addresses: string[] = []

    for (const log of logs) {
      logIndexToLogs.set(log.logIndex, log)
      addresses.push(log.address)
    }

    for (const blockDto of blocksDto) {
      blockNumberToBlock.set(blockDto.number, blockDto)
    }

    if (this.l2Erc20TokenGatewayAddress in addresses) {
      const events = TransactionEventHelper.filterLog(
        logs,
        this.withdrawalInitiatedEvent,
        this.l2Erc20TokenGatewayAddress,
      )

      for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const log: Log = logIndexToLogs.get(event.logIndex)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const blockDto: BlockDto = blockNumberToBlock.get(log.blockNumber)

        this.withdrawalsCache.push({
          time: blockDto.timestamp,
          amount: new BigNumber(String(event.args.amount)),
        })
      }
    }
  }
}
