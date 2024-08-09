import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ethers } from 'forta-agent'
import { either as E } from 'fp-ts'
import { retryAsync } from 'ts-retry'
import { BigNumber as EtherBigNumber } from '@ethersproject/bignumber/lib/bignumber'
import {
  CSModule as CSModuleRunner,
  CSAccounting as CSAccountingRunner,
  CSFeeDistributor as CSFeeDistributorRunner,
  CSFeeOracle as CSFeeOracleRunner,
} from '../generated/typechain'
import { NetworkError } from '../utils/errors'
import { Logger } from 'winston'
import { ICSAccountingClient } from '../services/CSAccounting/CSAccounting.srv'
import { Block, BlockTag } from '@ethersproject/providers'
import { ICSModuleClient } from '../services/CSModule/CSModule.srv'
import { ICSFeeOracleClient } from '../services/CSFeeOracle/CSFeeOracle.srv'
import { ICSFeeDistributorClient } from '../services/CSFeeDistributor/CSFeeDistributor.srv'
import { Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { BlockDto } from '../entity/events'
import { DataRW } from '../utils/mutex'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export abstract class IEtherscanProvider {
  abstract getHistory(
    addressOrName: string | Promise<string>,
    startBlock?: BlockTag,
    endBlock?: BlockTag,
  ): Promise<Array<TransactionResponse>>

  abstract getBalance(
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>,
  ): Promise<EtherBigNumber>
}

export class ETHProvider implements ICSAccountingClient, ICSModuleClient, ICSFeeOracleClient, ICSFeeDistributorClient {
  private jsonRpcProvider: ethers.providers.JsonRpcProvider
  private etherscanProvider: IEtherscanProvider

  private readonly csModuleRunner: CSModuleRunner
  private readonly csAccountingRunner: CSAccountingRunner
  private readonly csFeeDistributorRunner: CSFeeDistributorRunner
  private csFeeOracleRunner: CSFeeOracleRunner

  private readonly logger: Logger
  private readonly metrics: Metrics

  constructor(
    logger: Logger,
    metrcs: Metrics,
    jsonRpcProvider: ethers.providers.JsonRpcProvider,
    etherscanProvider: IEtherscanProvider,
    csModuleRunner: CSModuleRunner,
    csAccountingRunner: CSAccountingRunner,
    csFeeDistributorRunner: CSFeeDistributorRunner,
    csFeeOracleRunner: CSFeeOracleRunner,
  ) {
    this.jsonRpcProvider = jsonRpcProvider
    this.etherscanProvider = etherscanProvider
    this.csModuleRunner = csModuleRunner
    this.csAccountingRunner = csAccountingRunner
    this.csFeeDistributorRunner = csFeeDistributorRunner
    this.csFeeOracleRunner = csFeeOracleRunner
    this.logger = logger
    this.metrics = metrcs
  }

  public async getBlockNumber(): Promise<E.Either<Error, number>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getBlockNumber' }).startTimer()
    try {
      const latestBlockNumber = await this.jsonRpcProvider.getBlockNumber()

      this.metrics.etherJsRequest.labels({ method: 'getBlockNumber', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right(latestBlockNumber)
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'getBlockNumber', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not fetch latest block number`))
    }
  }

  public async getHistory(
    depositSecurityAddress: string,
    startBlock: number,
    endBlock: number,
  ): Promise<E.Either<Error, TransactionResponse[]>> {
    const end = this.metrics.etherJsDurationHistogram.labels({ method: 'getHistory' }).startTimer()
    const fetchBatch = async (start: number, end: number): Promise<TransactionResponse[]> => {
      try {
        const out = await retryAsync<TransactionResponse[]>(
          async (): Promise<TransactionResponse[]> => {
            return await this.etherscanProvider.getHistory(depositSecurityAddress, start, end)
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )

        this.metrics.etherJsRequest.labels({ method: 'getHistory', status: StatusOK }).inc()
        return out
      } catch (err) {
        this.metrics.etherJsRequest.labels({ method: 'getHistory', status: StatusFail }).inc()
        throw new NetworkError(err, `Could not fetch transaction history between ${start} and ${end} blocks`)
      }
    }

    const batchPromises: Promise<void>[] = []
    const out = new DataRW<TransactionResponse>([])
    const batchSize = 10_000

    for (let i = startBlock; i <= endBlock; i += batchSize) {
      const start = i
      const end = Math.min(i + batchSize - 1, endBlock)

      const promise = fetchBatch(start, end).then((chunkTrxResp) => {
        out.write(chunkTrxResp)
      })

      batchPromises.push(promise)
    }

    try {
      await Promise.all(batchPromises)

      end({ status: StatusOK })
      return E.right(await out.read())
    } catch (e) {
      end({ status: StatusFail })
      return E.left(new NetworkError(e, `Could not fetch transaction history`))
    }
  }

  public async getBlockByHash(blockHash: string): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getBlockByHash' })

    try {
      const out = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock(blockHash)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: 'getBlockByHash', status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        number: out.number,
        timestamp: out.timestamp,
        parentHash: out.parentHash,
        hash: out.hash,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: 'getBlockByHash', status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.getBlock(blockHash)`))
    }
  }

  public async getBlockByNumber(blockNumber: number): Promise<E.Either<Error, BlockDto>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: this.getBlockByNumber.name })

    try {
      const out = await retryAsync<Block>(
        async (): Promise<Block> => {
          return await this.jsonRpcProvider.getBlock(blockNumber)
        },
        { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
      )

      this.metrics.etherJsRequest.labels({ method: this.getBlockByNumber.name, status: StatusOK }).inc()
      end({ status: StatusOK })

      return E.right({
        number: out.number,
        timestamp: out.timestamp,
        parentHash: out.parentHash,
        hash: out.hash,
      })
    } catch (e) {
      this.metrics.etherJsRequest.labels({ method: this.getBlockByNumber.name, status: StatusFail }).inc()
      end({ status: StatusFail })

      return E.left(new NetworkError(e, `Could not call jsonRpcProvider.${this.getBlockByNumber.name}`))
    }
  }

  public async getChainPrevBlocks(parentHash: string, depth: number): Promise<E.Either<Error, BlockDto[]>> {
    const end = this.metrics.etherJsDurationHistogram.startTimer({ method: 'getChainPrevBlocks' })
    const chain = new Array<BlockDto>(depth)

    while (depth > 0) {
      try {
        const prevBlock = await retryAsync<BlockDto>(
          async (): Promise<BlockDto> => {
            const parentBlock = await this.getBlockByHash(parentHash)

            if (E.isLeft(parentBlock)) {
              throw parentBlock.left
            }

            return parentBlock.right
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )

        chain[depth - 1] = prevBlock
        parentHash = prevBlock.parentHash
        depth -= 1
      } catch (e) {
        this.metrics.etherJsRequest.labels({ method: 'getChainPrevBlocks', status: StatusFail }).inc()
        end({ status: StatusFail })

        return E.left(new NetworkError(e, `Could not call this.getBlockByHash(parentHash)`))
      }
    }

    this.metrics.etherJsRequest.labels({ method: 'getChainPrevBlocks', status: StatusOK }).inc()
    end({ status: StatusOK })

    return E.right(chain)
  }
}
