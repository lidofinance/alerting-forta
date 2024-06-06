import { BlockDto } from '../entity/blockDto'
import { IL2Client } from './l2_client'
import { Log } from '@ethersproject/abstract-provider'
import { Finding } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../utils/finding.helpers'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'


export class L2BlockClient {
  private provider: IL2Client
  private logger: Logger
  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(provider: IL2Client, logger: Logger) {
    this.provider = provider
    this.logger = logger
  }

  public async getL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const start = new Date().getTime()
    const blocks = await this.fetchL2Blocks()
    this.logger.info(elapsedTime(L2BlockClient.name + '.' + this.getL2Blocks.name, start))

    return blocks
  }

  public async getL2Logs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const start = new Date().getTime()
    const logs = await this.fetchL2Logs(workingBlocks)
    this.logger.info(elapsedTime(L2BlockClient.name + '.' + this.getL2Logs.name, start))

    return logs
  }

  private async fetchL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const out: BlockDto[] = []

    if (this.cachedBlockDto === undefined) {
      const l2Block = await this.provider.getLatestL2Block()
      if (E.isLeft(l2Block)) {
        return E.left(
          networkAlert(
            l2Block.left,
            `Error in ${L2BlockClient.name}.${this.getL2Blocks.name}:21`,
            `Could not call l2Provider.getLatestL2Block`,
            0,
          ),
        )
      }

      this.cachedBlockDto = {
        number: l2Block.right.number,
        timestamp: l2Block.right.timestamp,
      }

      out.push(this.cachedBlockDto)
    } else {
      const latestL2Block = await this.provider.getLatestL2Block()
      if (E.isLeft(latestL2Block)) {
        this.cachedBlockDto = undefined
        return E.left(
          networkAlert(
            latestL2Block.left,
            `Error in ${L2BlockClient.name}.${this.getL2Blocks.name}:39`,
            `Could not call l2Provider.getLatestL2Block`,
            0,
          ),
        )
      }

      const l2Blocks = await this.provider.fetchL2Blocks(this.cachedBlockDto.number, latestL2Block.right.number - 1)
      for (const l2Block of l2Blocks) {
        out.push({
          number: l2Block.number,
          timestamp: l2Block.timestamp,
        })
      }

      this.cachedBlockDto = {
        number: latestL2Block.right.number,
        timestamp: latestL2Block.right.timestamp,
      }

      // hint: we requested blocks like [cachedBlockDto.number, latestBlock.number)
      // and here we do [cachedBlockDto.number, latestBlock.number]
      out.push({
        number: latestL2Block.right.number,
        timestamp: latestL2Block.right.timestamp,
      })
    }

    return E.right(out)
  }

  private async fetchL2Logs(workingL2Blocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const l2Logs = await this.provider.getL2Logs(
      workingL2Blocks[0].number,
      workingL2Blocks[workingL2Blocks.length - 1].number,
    )
    if (E.isLeft(l2Logs)) {
      return E.left(
        networkAlert(
          l2Logs.left,
          `Error in ${L2BlockClient.name}.${this.getL2Logs.name}:76`,
          `Could not call l2Provider.getL2Logs`,
          workingL2Blocks[workingL2Blocks.length - 1].number,
        ),
      )
    }

    return E.right(l2Logs.right)
  }
}
