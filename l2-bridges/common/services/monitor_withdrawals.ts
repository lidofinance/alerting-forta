import BigNumber from 'bignumber.js'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { Logger } from 'winston'
import { Log } from '@ethersproject/abstract-provider'
import * as E from 'fp-ts/Either'
import { BlockDto, WithdrawalRecord } from '../entity/blockDto'
import { L2Client } from '../clients/l2_client'
import { NetworkError } from '../utils/error'
import { elapsedTime } from '../utils/time'
import { ETH_DECIMALS, ETH_DECIMALS2 } from '../constants'
import { formatAddress } from 'forta-agent/dist/cli/utils'
import { ethers } from 'ethers'
import { WithdrawalInfo, ContractInfo, HugeWithdrawalsFromL2AlertParams } from '../constants'
import { strict as assert } from 'node:assert'


export const MAX_WITHDRAWALS_SUM = 10_000 // 10k wstETH
const HOURS_48 = 60 * 60 * 24 * 2

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string,
}

export type WithdrawalConstants = {
  withdrawalInfo: WithdrawalInfo,
  L2_APPROX_BLOCK_TIME_SECONDS: number,
  L2_ERC20_TOKEN_GATEWAY: ContractInfo,
  getHugeWithdrawalsFromL2Alert: (params: HugeWithdrawalsFromL2AlertParams) => Finding,
}

export class MonitorWithdrawals {
  private readonly name: string = 'WithdrawalsMonitor'

  private readonly logger: Logger
  private readonly l2Erc20TokenGatewayAddress: string
  private readonly l2Client: L2Client
  private readonly withdrawalInfo: WithdrawalInfo & { eventSignature: string, eventInterface: ethers.utils.Interface }
  private readonly l2BlockAverageTime: number
  private readonly constants: WithdrawalConstants

  private withdrawalsStore: WithdrawalRecord[] = []
  private lastReportedTooManyWithdrawalsTimestamp = 0

  constructor(l2Client: L2Client, logger: Logger, withdrawalConstants: WithdrawalConstants) {
    const eventInterface = new ethers.utils.Interface([withdrawalConstants.withdrawalInfo.eventDefinition])
    this.constants = withdrawalConstants
    this.l2Client = l2Client
    this.l2Erc20TokenGatewayAddress = withdrawalConstants.L2_ERC20_TOKEN_GATEWAY.address
    this.logger = logger
    this.withdrawalInfo = {
      ...withdrawalConstants.withdrawalInfo,
      eventSignature: eventInterface.getEventTopic(withdrawalConstants.withdrawalInfo.eventName),
      eventInterface: eventInterface,
    }
    this.l2BlockAverageTime = withdrawalConstants.L2_APPROX_BLOCK_TIME_SECONDS

  }

  public getName(): string {
    return this.name
  }

  public async initialize(currentBlock: number): Promise<E.Either<NetworkError, MonitorWithdrawalsInitResp>> {
    const start = new Date().getTime()
    const startBlock = currentBlock - Math.ceil(HOURS_48 / this.l2BlockAverageTime)
    const endBlock = currentBlock - 1

    const withdrawalRecords = await this._getWithdrawalRecordsInBlockRange(startBlock, endBlock)
    if (E.isLeft(withdrawalRecords)) {
      return E.left(withdrawalRecords.left)
    }

    let withdrawalsSum = 0n
    for (const wc of withdrawalRecords.right) {
      withdrawalsSum += BigInt(wc.amount.toString())
      this.withdrawalsStore.push(wc)
    }

    this.logger.info(`${MonitorWithdrawals.name} started on block ${currentBlock}.`
      + ` Fetched past withdrawal events in blocks range [${startBlock}, ${endBlock}]`)
    this.logger.info(elapsedTime(MonitorWithdrawals.name + '.' + this._getWithdrawalRecordsInBlockRange.name, start))
    return E.right({
      // TODO: use formatEther
      currentWithdrawals: (new BigNumber(withdrawalsSum.toString())).div(ETH_DECIMALS).toFixed(4),
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

      let withdrawalsSum = 0n
      for (const wc of this.withdrawalsStore) {
        withdrawalsSum += BigInt(wc.amount.toString())
      }

      // block number condition is meant to "sync" agents alerts
      if (withdrawalsSum >= BigInt(MAX_WITHDRAWALS_SUM) * ETH_DECIMALS2 && l2Block.number % 10 === 0) {
        const period =
          l2Block.timestamp - this.lastReportedTooManyWithdrawalsTimestamp < HOURS_48
            ? l2Block.timestamp - this.lastReportedTooManyWithdrawalsTimestamp
            : HOURS_48

        out.push(this.constants.getHugeWithdrawalsFromL2Alert({
          period, withdrawalsSum, l2BlockNumber: l2Block.number
        }))

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

  public async _getWithdrawalRecordsInBlockRange(startBlock: number, endBlock: number): Promise<E.Either<NetworkError, WithdrawalRecord[]>> {
    const withdrawalLogsE = await this.l2Client.getL2Logs(startBlock, endBlock, this.l2Erc20TokenGatewayAddress, this.withdrawalInfo.eventSignature)
    if (E.isLeft(withdrawalLogsE)) {
      return E.left(withdrawalLogsE.left)
    }
    const blocksToRequest = new Set<number>()
    const blockNumberToTime = new Map<number, number>()
    const withdrawalRecordsAux: { amount: bigint, blockNumber: number }[] = []
    for (const log of withdrawalLogsE.right) {
     const event = this.withdrawalInfo.eventInterface.parseLog(log)
      // NB: log.blockNumber is actually a string, although its typescript type is number
      const blockNumber = (typeof log.blockNumber === 'number') ? log.blockNumber : Number(log.blockNumber)
      withdrawalRecordsAux.push({
        blockNumber: blockNumber,
        amount: BigInt(String(event.args[this.withdrawalInfo.amountFieldName]))
      })
      blocksToRequest.add(blockNumber)
    }
    const blocks = await this.l2Client.fetchL2Blocks(blocksToRequest)
    for (const oneBlock of blocks) {
      blockNumberToTime.set(oneBlock.number, oneBlock.timestamp)
    }
    const result: WithdrawalRecord[] = []
    for (const record of withdrawalRecordsAux) {
      const blockTime = blockNumberToTime.get(record.blockNumber)
      assert(blockTime)
      result.push({ time: blockTime, amount: record.amount })
    }

    return E.right(result)
  }

  private getWithdrawalRecords(l2Logs: Log[], l2BlocksDto: BlockDto[]): WithdrawalRecord[] {
    const blockNumberToBlock = new Map<number, BlockDto>()
    const logIndexToLogs = new Map<number, Log>()
    const addresses = new Set<string>()

    for (const l2Log of l2Logs) {
      logIndexToLogs.set(l2Log.logIndex, l2Log)
      addresses.add(formatAddress(l2Log.address))
    }

    for (const l2BlockDto of l2BlocksDto) {
      blockNumberToBlock.set(l2BlockDto.number, l2BlockDto)
    }

    const out: WithdrawalRecord[] = []
    if (addresses.has(formatAddress(this.l2Erc20TokenGatewayAddress))) {
      const events = filterLog(l2Logs, this.withdrawalInfo.eventDefinition, formatAddress(this.l2Erc20TokenGatewayAddress))

      for (const event of events) {
        const log = logIndexToLogs.get(event.logIndex)
        assert(log !== undefined)

        assert(typeof log.blockNumber === 'string')
        const blockDto = blockNumberToBlock.get(parseInt(log.blockNumber as unknown as string, 16))
        assert(blockDto) // TODO
        const amount = event.args[this.withdrawalInfo.amountFieldName]
        assert(amount !== null && amount !== undefined)
        out.push({
          time: blockDto.timestamp,
          amount,
        })
      }
    }

    return out
  }
}
