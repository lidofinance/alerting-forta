import BigNumber from 'bignumber.js'
import { BlockDto, WithdrawalRecord } from '../entity/blockDto'
import * as E from 'fp-ts/Either'
import { elapsedTime } from '../utils/time'
import { Logger } from 'winston'
import { NetworkError } from '../utils/errors'
import { WithdrawalInitiatedEvent } from '../generated/typechain/L2ERC20TokenGateway'
import { Finding } from '../generated/proto/alert_pb'
import { TransactionDto } from '../entity/events'
import { ethers } from 'forta-agent'
import { ETH_DECIMALS } from '../utils/constants'

// 10k wstETH
const MAX_WITHDRAWALS_10K_WstEth = 10_000

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string
}

export const HOURS_48 = 60 * 60 * 24 * 2
export const AVG_BLOCK_TIME_2SECONDS: number = 2 //s

export abstract class IMonitorWithdrawalsClient {
  public abstract getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, WithdrawalInitiatedEvent[]>>

  public abstract getWithdrawalRecords(
    withdrawalEvents: WithdrawalInitiatedEvent[],
  ): Promise<E.Either<NetworkError, WithdrawalRecord[]>>
}

export class MonitorWithdrawals {
  private readonly name: string = 'WithdrawalsMonitor'
  private readonly withdrawalInitiatedEvent =
    'event WithdrawalInitiated(address l1Token, address indexed from, address indexed to, uint256 indexed l2ToL1Id, uint256 exitNum, uint256 amount)'

  private readonly logger: Logger
  private readonly arbitrumL2TokenGateway: string
  private readonly withdrawalsClient: IMonitorWithdrawalsClient

  private withdrawalStore: WithdrawalRecord[] = []
  private toManyWithdrawalsTimestamp = 0

  constructor(withdrawalsClient: IMonitorWithdrawalsClient, arbitrumL2TokenGateway: string, logger: Logger) {
    this.withdrawalsClient = withdrawalsClient
    this.arbitrumL2TokenGateway = arbitrumL2TokenGateway
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public async initialize(currentBlock: number): Promise<E.Either<NetworkError, MonitorWithdrawalsInitResp>> {
    // 48 hours
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

  public handleL2Block(l2BlockDto: BlockDto): Finding[] {
    const start = new Date().getTime()

    const out: Finding[] = []

    // remove withdrawals records older than MAX_WITHDRAWALS_WINDOW
    const withdrawalsCache: WithdrawalRecord[] = []
    for (const wc of this.withdrawalStore) {
      if (l2BlockDto.timestamp - HOURS_48 < wc.timestamp) {
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
      l2BlockDto.number % 10 === 0
    ) {
      const period =
        l2BlockDto.timestamp - this.toManyWithdrawalsTimestamp < HOURS_48
          ? l2BlockDto.timestamp - this.toManyWithdrawalsTimestamp
          : HOURS_48

      const f: Finding = new Finding()
      f.setName(`⚠️ arbitrum: Huge withdrawals during the last ` + `${Math.floor(period / (60 * 60))} hour(s)`)
      f.setDescription(
        `There were withdrawals requests from L2 to L1 for the ` +
          `${withdrawalsSum.div(ETH_DECIMALS).toFixed(4)} wstETH in total`,
      )
      f.setAlertid('HUGE-WITHDRAWALS-FROM-L2')
      f.setSeverity(Finding.Severity.MEDIUM)
      f.setType(Finding.FindingType.SUSPICIOUS)
      f.setProtocol('arbitrum')

      out.push(f)

      this.toManyWithdrawalsTimestamp = l2BlockDto.timestamp

      const tmp: WithdrawalRecord[] = []
      for (const wc of this.withdrawalStore) {
        if (l2BlockDto.timestamp - this.toManyWithdrawalsTimestamp < wc.timestamp) {
          tmp.push(wc)
        }
      }

      this.withdrawalStore = tmp
    }

    this.logger.info(elapsedTime(MonitorWithdrawals.name + '.' + this.handleL2Block.name, start))
    return out
  }

  public handleTransaction(txDto: TransactionDto): WithdrawalRecord | null {
    for (const log of txDto.logs) {
      if (log.address.toLowerCase() !== this.arbitrumL2TokenGateway.toLowerCase()) {
        continue
      }

      const parser = new ethers.utils.Interface([this.withdrawalInitiatedEvent])
      try {
        const logDesc = parser.parseLog(log)

        const out: WithdrawalRecord = {
          timestamp: txDto.block.timestamp,
          amount: new BigNumber(String(logDesc.args.amount)),
        }

        this.withdrawalStore.push(out)

        return out
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      }
    }

    return null
  }
}
