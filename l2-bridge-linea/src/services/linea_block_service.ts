import { BlockDto } from 'src/entity/blockDto'
import { ILineaProvider } from '../clients/linea_provider'
import { Log } from '@ethersproject/abstract-provider'
import { Finding, FindingSeverity, FindingType } from 'forta-agent'
import * as E from 'fp-ts/Either'

export class BlockSrv {
  private lineaProvider: ILineaProvider

  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(provider: ILineaProvider) {
    this.lineaProvider = provider
  }

  public async getBlocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const out: BlockDto[] = []

    if (this.cachedBlockDto === undefined) {
      const block = await this.lineaProvider.getLatestBlock()
      if (E.isLeft(block)) {
        const f: Finding = Finding.fromObject({
          name: `Error in ${BlockSrv.name}.${this.lineaProvider.getLatestBlock.name}:21`,
          description: `${block.left.message}`,
          alertId: 'LIDO-AGENT-ERROR',
          severity: FindingSeverity.Low,
          type: FindingType.Degraded,
          metadata: { stack: `${block.left.stack}` },
        })

        return E.left(f)
      }

      this.cachedBlockDto = {
        number: block.right.number,
        timestamp: block.right.timestamp,
      }

      out.push(this.cachedBlockDto)
    } else {
      const latestBlock = await this.lineaProvider.getLatestBlock()
      if (E.isLeft(latestBlock)) {
        const f: Finding = Finding.fromObject({
          name: `Error in ${BlockSrv.name}.${this.lineaProvider.getLatestBlock.name}:42`,
          description: `${latestBlock.left.message}`,
          alertId: 'LIDO-AGENT-ERROR',
          severity: FindingSeverity.Low,
          type: FindingType.Degraded,
          metadata: { stack: `${latestBlock.left.stack}` },
        })

        this.cachedBlockDto = undefined
        return E.left(f)
      }

      const blocks = await this.lineaProvider.fetchBlocks(this.cachedBlockDto.number, latestBlock.right.number - 1)
      if (E.isLeft(blocks)) {
        const f: Finding = Finding.fromObject({
          name: `Error in ${BlockSrv.name}.${this.lineaProvider.fetchBlocks.name}:56`,
          description: `${blocks.left.message}`,
          alertId: 'LIDO-AGENT-ERROR',
          severity: FindingSeverity.Medium,
          type: FindingType.Degraded,
          metadata: { stack: `${blocks.left.stack}` },
        })

        this.cachedBlockDto = undefined
        return E.left(f)
      }

      for (const block of blocks.right) {
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

  public async getLogs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const logs = await this.lineaProvider.getLogs(
      workingBlocks[0].number,
      workingBlocks[workingBlocks.length - 1].number,
    )
    if (E.isLeft(logs)) {
      const f: Finding = Finding.fromObject({
        name: `Error in ${BlockSrv.name}.${this.lineaProvider.getLogs}:95`,
        description: `${logs.left.message}`,
        alertId: 'LIDO-AGENT-ERROR',
        severity: FindingSeverity.Medium,
        type: FindingType.Degraded,
        metadata: { stack: `${logs.left.stack}` },
      })

      return E.left(f)
    }

    return E.right(logs.right)
  }
}
