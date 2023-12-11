import { BlockDto } from 'src/entity/blockDto'
import { IBaseProvider } from '../clients/base_provider'
import { Block, Log } from '@ethersproject/abstract-provider'
import { Finding } from 'forta-agent'
import { errorToFinding } from '../utils/error'
import * as E from 'fp-ts/Either'

export class BaseBlockSrv {
  private baseProvider: IBaseProvider

  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(baseProvider: IBaseProvider) {
    this.baseProvider = baseProvider
  }

  public async getBaseBlocks(): Promise<E.Either<Finding, BlockDto[]>> {
    try {
      const out: BlockDto[] = []

      if (this.cachedBlockDto === undefined) {
        const block: Block = await this.baseProvider.getLatestBlock()

        this.cachedBlockDto = {
          number: block.number,
          timestamp: block.timestamp,
        }

        out.push(this.cachedBlockDto)
      } else {
        const latestBlock: Block = await this.baseProvider.getLatestBlock()

        const blocks: Block[] = await this.baseProvider.fetchBlocks(
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
      return E.left(
        errorToFinding(e, BaseBlockSrv.name, this.getBaseBlocks.name),
      )
    }
  }

  public async getLogs(
    workingBlocks: BlockDto[],
  ): Promise<E.Either<Finding, Log[]>> {
    try {
      const logs = await this.baseProvider.getLogs(
        workingBlocks[0].number,
        workingBlocks[workingBlocks.length - 1].number,
      )

      return E.right(logs)
    } catch (e) {
      return E.left(errorToFinding(e, BaseBlockSrv.name, this.getLogs.name))
    }
  }
}
