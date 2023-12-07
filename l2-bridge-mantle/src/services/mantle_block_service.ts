import { BlockDto } from 'src/entity/blockDto'
import { IMantleProvider } from '../clients/mantle_provider'
import { Block, Log } from '@ethersproject/abstract-provider'
import { Finding } from 'forta-agent'
import { errorToFinding } from '../utils/error'
import * as E from 'fp-ts/Either'

export class BlockSrv {
  private mantleProvider: IMantleProvider

  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(provider: IMantleProvider) {
    this.mantleProvider = provider
  }

  public async getBlocks(): Promise<E.Either<Finding, BlockDto[]>> {
    try {
      const out: BlockDto[] = []

      if (this.cachedBlockDto === undefined) {
        const block: Block = await this.mantleProvider.getLatestBlock()

        this.cachedBlockDto = {
          number: block.number,
          timestamp: block.timestamp,
        }

        out.push(this.cachedBlockDto)
      } else {
        const latestBlock: Block = await this.mantleProvider.getLatestBlock()

        const blocks: Block[] = await this.mantleProvider.fetchBlocks(
          this.cachedBlockDto.number,
          latestBlock.number - 1,
        )

        for (const block of blocks) {
          out.push({
            number: block.number,
            timestamp: block.timestamp,
          })
        }

        this.cachedBlockDto = {
          number: latestBlock.number,
          timestamp: latestBlock.timestamp,
        }

        // hint: we requested blocks like [cachedBlockDto.number, latestBlock.number)
        // and here we do [cachedBlockDto.number, latestBlock.number]
        out.push({
          number: latestBlock.number,
          timestamp: latestBlock.timestamp,
        })
      }

      return E.right(out)
    } catch (e) {
      return E.left(errorToFinding(e, BlockSrv.name, this.getBlocks.name))
    }
  }

  public async getLogs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    try {
      const logs = await this.mantleProvider.getLogs(
        workingBlocks[0].number,
        workingBlocks[workingBlocks.length - 1].number,
      )

      return E.right(logs)
    } catch (e) {
      return E.left(errorToFinding(e, BlockSrv.name, this.getLogs.name))
    }
  }
}
