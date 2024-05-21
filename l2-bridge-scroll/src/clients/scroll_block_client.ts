import { BlockDto } from 'src/entity/blockDto'
import { Block, Log, TransactionResponse } from '@ethersproject/abstract-provider'
import { Finding } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { networkAlert } from '../utils/finding.helpers'
import { NetworkError } from '../utils/error'

export abstract class IScrollProvider {
  public abstract fetchBlocks(startBlock: number, endBlock: number): Promise<Block[]>

  public abstract getLogs(startBlock: number, endBlock: number): Promise<E.Either<NetworkError, Log[]>>

  public abstract getLatestBlock(): Promise<E.Either<NetworkError, Block>>

  public abstract getTransaction(txHash: string): Promise<E.Either<NetworkError, TransactionResponse>>

  public abstract getBlockNumber(): Promise<E.Either<NetworkError, number>>
}

export class BlockClient {
  private provider: IScrollProvider
  private logger: Logger
  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(provider: IScrollProvider, logger: Logger) {
    this.provider = provider
    this.logger = logger
  }

  public async getL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const start = new Date().getTime()
    const blocks = await this.fetchBlocks()
    this.logger.info(elapsedTime(BlockClient.name + '.' + this.getL2Blocks.name, start))

    return blocks
  }

  public async getL2Logs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const start = new Date().getTime()
    const logs = await this.fetchLogs(workingBlocks)
    this.logger.info(elapsedTime(BlockClient.name + '.' + this.getL2Logs.name, start))

    return logs
  }

  private async fetchBlocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const out: BlockDto[] = []

    if (this.cachedBlockDto === undefined) {
      const block = await this.provider.getLatestBlock()
      if (E.isLeft(block)) {
        return E.left(
          networkAlert(
            block.left,
            `Error in ${BlockClient.name}.${this.getL2Blocks.name}:21`,
            `Could not call provider.getLatestBlock`,
            0,
          ),
        )
      }

      this.cachedBlockDto = {
        number: block.right.number,
        timestamp: block.right.timestamp,
      }

      out.push(this.cachedBlockDto)
    } else {
      const latestBlock = await this.provider.getLatestBlock()
      if (E.isLeft(latestBlock)) {
        this.cachedBlockDto = undefined
        return E.left(
          networkAlert(
            latestBlock.left,
            `Error in ${BlockClient.name}.${this.getL2Blocks.name}:39`,
            `Could not call provider.getLatestBlock`,
            0,
          ),
        )
      }

      const blocks = await this.provider.fetchBlocks(this.cachedBlockDto.number, latestBlock.right.number - 1)
      for (const block of blocks) {
        out.push({
          number: block.number,
          timestamp: block.timestamp,
        })
      }

      this.cachedBlockDto = {
        number: latestBlock.right.number,
        timestamp: latestBlock.right.timestamp,
      }

      // hint: we requested blocks like [cachedBlockDto.number, latestBlock.number)
      // and here we do [cachedBlockDto.number, latestBlock.number]
      out.push({
        number: latestBlock.right.number,
        timestamp: latestBlock.right.timestamp,
      })
    }

    return E.right(out)
  }

  private async fetchLogs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const logs = await this.provider.getLogs(workingBlocks[0].number, workingBlocks[workingBlocks.length - 1].number)
    if (E.isLeft(logs)) {
      return E.left(
        networkAlert(
          logs.left,
          `Error in ${BlockClient.name}.${this.getL2Logs.name}:76`,
          `Could not call provider.getLogs`,
          workingBlocks[workingBlocks.length - 1].number,
        ),
      )
    }

    return E.right(logs.right)
  }
}
