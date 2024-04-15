import { BlockDto } from '../entity/blockDto'
import { IMantleClient } from './mantle_provider'
import { Log } from '@ethersproject/abstract-provider'
import { Finding } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../utils/finding.helpers'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'

export class MantleBlockClient {
  private mantleProvider: IMantleClient
  private logger: Logger
  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(provider: IMantleClient, logger: Logger) {
    this.mantleProvider = provider
    this.logger = logger
  }

  public async getL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const start = new Date().getTime()
    const blocks = await this.fetchBlocks()
    this.logger.info(elapsedTime(MantleBlockClient.name + '.' + this.getL2Blocks.name, start))

    return blocks
  }

  public async getL2Logs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const start = new Date().getTime()
    const logs = await this.fetchLogs(workingBlocks)
    this.logger.info(elapsedTime(MantleBlockClient.name + '.' + this.getL2Logs.name, start))

    return logs
  }

  private async fetchBlocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const out: BlockDto[] = []

    if (this.cachedBlockDto === undefined) {
      const block = await this.mantleProvider.getLatestL2Block()
      if (E.isLeft(block)) {
        return E.left(
          networkAlert(
            block.left,
            `Error in ${MantleBlockClient.name}.${this.getL2Blocks.name}:21`,
            `Could not call mantleProvider.getLatestBlock`,
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
      const latestBlock = await this.mantleProvider.getLatestL2Block()
      if (E.isLeft(latestBlock)) {
        this.cachedBlockDto = undefined
        return E.left(
          networkAlert(
            latestBlock.left,
            `Error in ${MantleBlockClient.name}.${this.getL2Blocks.name}:39`,
            `Could not call mantleProvider.getLatestBlock`,
            0,
          ),
        )
      }

      const blocks = await this.mantleProvider.fetchL2Blocks(this.cachedBlockDto.number, latestBlock.right.number - 1)
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
    const logs = await this.mantleProvider.getLogs(
      workingBlocks[0].number,
      workingBlocks[workingBlocks.length - 1].number,
    )
    if (E.isLeft(logs)) {
      return E.left(
        networkAlert(
          logs.left,
          `Error in ${MantleBlockClient.name}.${this.getL2Logs.name}:76`,
          `Could not call mantleProvider.getLogs`,
          workingBlocks[workingBlocks.length - 1].number,
        ),
      )
    }

    return E.right(logs.right)
  }
}
