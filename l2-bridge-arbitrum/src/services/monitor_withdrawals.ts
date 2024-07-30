import BigNumber from 'bignumber.js'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { dbAlert } from '../utils/errors'
import { Finding } from '../generated/proto/alert_pb'
import { ethers } from 'ethers'
import { ETH_DECIMALS } from '../utils/constants'
import { Log } from '@ethersproject/abstract-provider'
import { WithdrawalDto, WithdrawalStat } from '../entity/withdrawal'
import { BlockDto } from '../entity/l2block'
import { WithdrawalRepo } from './monitor_withdrawals.repo'
import { L2Client } from '../clients/l2_client'
import { elapsed } from '../utils/time'
import { ETHProvider } from '../clients/eth_provider_client'
import { TransactionDto } from '../entity/events'

// 10k wstETH
const MAX_WITHDRAWALS_10K_WstEth = 10_000
export const HOURS_48 = 60 * 60 * 24 * 2
export const HOURS_1 = 60 * 60
export const AVG_BLOCK_TIME: number = 0.25

export class WithdrawalSrv {
  private readonly name: string = 'Withdrawal service'
  private readonly withdrawalInitiatedEvent =
    'event WithdrawalInitiated(address l1Token, address indexed from, address indexed to, uint256 indexed l2ToL1Id, uint256 exitNum, uint256 amount)'

  private readonly TokenRebasedEvent =
    'event TokenRebased(uint256 indexed reportTimestamp, uint256 timeElapsed, uint256 preTotalShares, uint256 preTotalEther, uint256 postTotalShares, uint256 postTotalEther, uint256 sharesMintedAsFees)'

  private readonly logger: Logger
  private readonly l2TokenGateway: string
  private readonly repo: WithdrawalRepo

  private readonly l1Client: ETHProvider
  private readonly l2Client: L2Client
  private readonly lidoStethAddress: string
  private readonly networkName: string

  private lastFindingTimestamp = new Date().getTime() - HOURS_1

  constructor(
    l1Client: ETHProvider,
    l2Client: L2Client,
    l2TokenGateway: string,
    logger: Logger,
    repo: WithdrawalRepo,
    networkName: string,
    lidoStethAddress: string,
  ) {
    this.l2TokenGateway = l2TokenGateway
    this.logger = logger
    this.repo = repo
    this.networkName = networkName
    this.l2Client = l2Client
    this.l1Client = l1Client
    this.lidoStethAddress = lidoStethAddress
  }

  public async initialize(currentBlock: number): Promise<E.Either<Error, Finding[]>> {
    const start = new Date().getTime()
    this.logger.info(`${this.name} started: ${new Date(start).toUTCString()}`)

    const from = currentBlock - Math.ceil(HOURS_48 / AVG_BLOCK_TIME)

    const l2Logs = await this.l2Client.fetchL2Logs(from, currentBlock, [this.l2TokenGateway])
    if (E.isLeft(l2Logs)) {
      return l2Logs
    }

    const l2BlockNumberSet = new Set<number>()
    for (const l2log of l2Logs.right) {
      l2BlockNumberSet.add(new BigNumber(l2log.blockNumber).toNumber())
    }

    const l2Blocks = await this.l2Client.fetchL2BlocksByList(Array.from(l2BlockNumberSet))

    const findings = await this.toMonitor(l2Logs.right, l2Blocks)

    this.logger.info(`${this.name} finished. Duration: ${elapsed(start)}\n`)
    return E.right(findings)
  }

  public async toMonitor(l2logs: Log[], l2Blocks: BlockDto[]): Promise<Finding[]> {
    const startWithdrawalSrv = new Date().getTime()
    this.logger.info(
      `\tWithdrawal service started: ${new Date(startWithdrawalSrv).toUTCString()}. L2Blocks: ${l2Blocks.length}`,
    )
    const out: Finding[] = []

    const withdrawals = this.getWithdrawals(l2logs, l2Blocks)
    if (withdrawals.length > 0) {
      const err = await this.repo.createOrUpdate(withdrawals)
      if (err !== null) {
        out.push(dbAlert(err, `Could not createOrUpdate withdrawals`, err.message))

        return out
      }

      const rmvErr = await this.repo.removeLessThen(l2Blocks[l2Blocks.length - 1].timestamp - HOURS_48)
      if (rmvErr !== null) {
        out.push(dbAlert(rmvErr, `Could not removeLessThen withdrawals`, rmvErr.message))
        return out
      }
    }

    const stat = await this.repo.getWithdrawalStat()
    if (E.isLeft(stat)) {
      out.push(dbAlert(stat.left, `Could not getTotalWithdrawals`, stat.left.message))
      return out
    }

    if (stat.right.amount >= MAX_WITHDRAWALS_10K_WstEth) {
      if (new Date().getTime() - this.lastFindingTimestamp > HOURS_1) {
        const f: Finding = new Finding()
        f.setName(`⚠️ ${this.networkName}: Huge withdrawals in total`)
        f.setDescription(`There were withdrawals requests from L2 to L1 for the ${stat.right.amount} wstETH in total`)
        f.setAlertid('HUGE-WITHDRAWALS-FROM-L2')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        out.push(f)
      }

      this.lastFindingTimestamp = new Date().getTime()
    }

    this.logger.info(`\t\tTotal withdrawals(${stat.right.total}): ${stat.right.amount} wStEth`)
    this.logger.info(`\tWithdrawal service finished. Duration: ${elapsed(startWithdrawalSrv)}`)

    return out
  }

  public getWithdrawals(l2logs: Log[], l2Blocks: BlockDto[]): WithdrawalDto[] {
    const out: WithdrawalDto[] = []

    for (const log of l2logs) {
      if (log.address.toLowerCase() !== this.l2TokenGateway.toLowerCase()) {
        continue
      }

      const parser = new ethers.utils.Interface([this.withdrawalInitiatedEvent])
      try {
        const logDesc = parser.parseLog(log)

        for (const l2block of l2Blocks) {
          if (new BigNumber(l2block.number).eq(new BigNumber(log.blockNumber))) {
            const w = new WithdrawalDto(
              l2block.number,
              log.blockHash,
              log.transactionHash,
              l2block.timestamp,
              new BigNumber(String(logDesc.args.amount)).div(ETH_DECIMALS).toNumber(),
            )

            out.push(w)
            break
          }
        }
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      }
    }

    return out
  }

  public hasRebasedEvent(txEvent: TransactionDto): boolean {
    for (const log of txEvent.logs) {
      if (log.address.toLowerCase() !== this.lidoStethAddress.toLowerCase()) {
        continue
      }

      const parser = new ethers.utils.Interface([this.TokenRebasedEvent])
      try {
        parser.parseLog(log)
        return true
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      }
    }

    return false
  }

  public async getWithdrawalStat(): Promise<E.Either<Error, WithdrawalStat>> {
    return await this.repo.getWithdrawalStat()
  }
}
