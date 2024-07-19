import { Knex } from 'knex'
import { either as E } from 'fp-ts'
import { BlockDto, L2BockSql, sqlToL2Block } from '../../entity/l2block'
import { SECONDS_60, SECONDS_768 } from '../../utils/time'

export const KnexErr = Error
export const NotFound = new Error('Not found')

export class L2BlocksRepo {
  private readonly l2Blocks = 'l2_blocks'
  private readonly knex: Knex

  constructor(knex: Knex) {
    this.knex = knex
  }

  public async getBlockById(id: number): Promise<E.Either<Error, BlockDto | null>> {
    try {
      const data = await this.knex<L2BockSql>(this.l2Blocks).select('*').where('id', id).limit(1)

      if (data.length === 0) {
        return E.right(null)
      }

      return E.right(sqlToL2Block(data[0]))
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getLastL2Block(): Promise<E.Either<Error, BlockDto | null>> {
    try {
      const data = await this.knex<L2BockSql>(this.l2Blocks).select('*').orderBy('id', 'desc').limit(1)

      if (data.length === 0) {
        return E.right(null)
      }

      return E.right(sqlToL2Block(data[0]))
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async createOrUpdate(l2Blocks: BlockDto[]): Promise<Error | null> {
    const data: L2BockSql[] = []

    for (const r of l2Blocks) {
      data.push(r.toSqlObject())
    }

    const trx = await this.knex.transaction()

    try {
      const chunkSize = 100
      for (let i = 0; i < data.length; i += chunkSize) {
        await trx
          .insert(data.slice(i, i + chunkSize))
          .into(this.l2Blocks)
          .onConflict('hash')
          .merge()
      }

      await trx.commit()
      return null
    } catch (e) {
      await trx.rollback()
      return new KnexErr(`${e}`)
    }
  }

  public async insertL2Block(latestL2Block: BlockDto): Promise<Error | null> {
    try {
      const l2BlockSql = latestL2Block.toSqlObject()
      await this.knex.insert([l2BlockSql]).into(this.l2Blocks).onConflict('id').merge()

      return null
    } catch (e) {
      return new KnexErr(`${e}`)
    }
  }

  public async removeOutdated(earlierInSeconds: number): Promise<Error | null> {
    try {
      await this.knex.delete().from(this.l2Blocks).whereRaw(`unixepoch() - timestamp >= ${earlierInSeconds}`)

      return null
    } catch (e) {
      return new KnexErr(`${e}`)
    }
  }

  public async getL2BlocksClosetTimestamp(timestamp: number): Promise<E.Either<Error, BlockDto[]>> {
    try {
      const l2BlocksSQL = await this.knex.raw<L2BockSql[]>(`
with oldest as (
    select * from l2_blocks
    where timestamp between ${timestamp} - ${SECONDS_768} and ${timestamp}
    order by id desc
    limit 1
), latest as (
    select * from l2_blocks
    where timestamp between ${timestamp} and ${timestamp} + ${SECONDS_60}
    order by id asc
    limit 1
)

select * from oldest
union
select * from latest

order by id;`)

      const out: BlockDto[] = []
      for (const l2BlockSql of l2BlocksSQL) {
        out.push(sqlToL2Block(l2BlockSql))
      }

      return E.right(out)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getL2BlocksFrom(id: number): Promise<E.Either<Error, BlockDto[]>> {
    try {
      const data = await this.knex<L2BockSql>(this.l2Blocks).select('*').where('id', '>', id).orderBy('id')

      const out: BlockDto[] = []
      for (const l2BlockSql of data) {
        out.push(sqlToL2Block(l2BlockSql))
      }

      return E.right(out)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }
}
