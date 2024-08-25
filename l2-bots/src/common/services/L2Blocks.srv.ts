import { L2Client } from '../clients/l2_client'
import { L2BlocksRepo } from './L2Blocks.repo'
import * as E from 'fp-ts/Either'
import { Log } from '@ethersproject/abstract-provider'
import { BlockDto } from '../entity/blockDto'

export type L2BlocksStore = {
  prevLatestL2Block: BlockDto
  l2Blocks: BlockDto[]
  l2Logs: Log[]
}

export class L2BlocksSrv {
  private readonly l2Client: L2Client
  private readonly repo: L2BlocksRepo
  private readonly filterAddress: string[]

  constructor(l2Client: L2Client, repo: L2BlocksRepo, filterAddress: string[] = []) {
    this.l2Client = l2Client
    this.repo = repo
    this.filterAddress = filterAddress
  }

  public async updGetL2BlocksStore(l1BlockDto: BlockDto): Promise<E.Either<Error, L2BlocksStore>> {
    const earlierInSeconds = 60 * 15
    await this.repo.removeOutdated(earlierInSeconds)

    const latestL2Block = await this.l2Client.getLatestL2Block()
    if (E.isLeft(latestL2Block)) {
      return latestL2Block
    }

    const cachedL2Block = await this.repo.getLastL2Block()
    console.debug({ cachedL2Block })
    if (E.isLeft(cachedL2Block)) {
      return cachedL2Block
    }

    if (cachedL2Block.right === null) {
      console.debug(`repo.insertL2Block(latestL2Block.right)`)
      const err = await this.repo.insertL2Block(latestL2Block.right)
      if (err !== null) {
        return E.left(err)
      }
      const l2Logs = await this.l2Client.getL2Logs(
        latestL2Block.right.number,
        latestL2Block.right.number,
        this.filterAddress,
      )
      if (E.isLeft(l2Logs)) {
        return l2Logs
      }

      const out: L2BlocksStore = {
        prevLatestL2Block: latestL2Block.right,
        l2Blocks: [latestL2Block.right],
        l2Logs: l2Logs.right,
      }

      return E.right(out)
    }

    const [l2Blocks, l2Logs] = await Promise.all([
      this.l2Client.fetchL2BlocksRange(cachedL2Block.right.number + 1, latestL2Block.right.number),
      this.l2Client.getL2Logs(cachedL2Block.right.number + 1, latestL2Block.right.number, this.filterAddress),
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
