import { L2Client } from '../../clients/l2_client'
import { L2BlocksRepo } from './L2Blocks.repo'
import * as E from 'fp-ts/Either'
import { Log } from '@ethersproject/abstract-provider'
import { BlockDto } from '../../entity/l2block'

export type L2BlocksStore = {
  prevLatestL2Block: BlockDto
  l2Blocks: BlockDto[]
  l2Logs: Log[]
}

export class L2BlocksSrv {
  private readonly l2Client: L2Client
  private readonly repo: L2BlocksRepo
  private readonly filterAddress: string[]

  constructor(arbClient: L2Client, repo: L2BlocksRepo, filterAddress: string[]) {
    this.l2Client = arbClient
    this.repo = repo
    this.filterAddress = filterAddress
  }

  public async updGetL2blocksStore(l1BlockDto: BlockDto): Promise<E.Either<Error, L2BlocksStore>> {
    const earlierInSeconds = 60 * 15
    await this.repo.removeOutdated(earlierInSeconds)

    const latestl2Block = await this.l2Client.getLatestL2Block()
    if (E.isLeft(latestl2Block)) {
      return latestl2Block
    }

    const cachedL2Block = await this.repo.getLastL2Block()
    if (E.isLeft(cachedL2Block)) {
      return cachedL2Block
    }

    if (cachedL2Block.right === null) {
      const err = await this.repo.insertL2Block(latestl2Block.right)
      if (err !== null) {
        return E.left(err)
      }
      const l2Logs = await this.l2Client.fetchL2Logs(
        latestl2Block.right.number,
        latestl2Block.right.number,
        this.filterAddress,
      )
      if (E.isLeft(l2Logs)) {
        return l2Logs
      }

      const out: L2BlocksStore = {
        prevLatestL2Block: latestl2Block.right,
        l2Blocks: [latestl2Block.right],
        l2Logs: l2Logs.right,
      }

      return E.right(out)
    }

    const [l2Blocks, l2Logs] = await Promise.all([
      this.l2Client.fetchL2Blocks(cachedL2Block.right.number + 1, latestl2Block.right.number),
      this.l2Client.fetchL2Logs(cachedL2Block.right.number + 1, latestl2Block.right.number, this.filterAddress),
    ])

    if (E.isLeft(l2Logs)) {
      return l2Logs
    }

    const err = await this.repo.createOrUpdate(l2Blocks)
    if (err !== null) {
      return E.left(err)
    }

    const closestL2Blocks = await this.repo.getL2BlocksClosetTimestamp(l1BlockDto.timestamp)
    if (E.isLeft(closestL2Blocks)) {
      return closestL2Blocks
    }
    const out: L2BlocksStore = {
      prevLatestL2Block: cachedL2Block.right,
      l2Blocks: closestL2Blocks.right,
      l2Logs: l2Logs.right,
    }

    return E.right(out)
  }

  public async getL2BlocksFrom(l1BlockDto: BlockDto): Promise<E.Either<Error, BlockDto[]>> {
    return await this.repo.getL2BlocksFrom(l1BlockDto.number)
  }
}
