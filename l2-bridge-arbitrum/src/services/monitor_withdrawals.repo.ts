import { Knex } from 'knex'
import { WithdrawalDto, WithdrawalSql, WithdrawalStat } from '../entity/withdrawal'
import { either as E } from 'fp-ts'

export const KnexErr = Error
export const NotFound = new Error('Not found')

export class WithdrawalRepo {
  private readonly withdrawals = 'withdrawals'
  private readonly knex: Knex

  constructor(knex: Knex) {
    this.knex = knex
  }

  public async createOrUpdate(withdrawals: WithdrawalDto[]): Promise<Error | null> {
    const data: WithdrawalSql[] = []

    for (const w of withdrawals) {
      data.push(w.toSqlObject())
    }

    const trx = await this.knex.transaction()

    try {
      const chunkSize = 100
      for (let i = 0; i < data.length; i += chunkSize) {
        await trx
          .insert(data.slice(i, i + chunkSize))
          .into(this.withdrawals)
          .onConflict('transaction_hash')
          .merge()
      }

      await trx.commit()
      return null
    } catch (e) {
      await trx.rollback()
      return new KnexErr(`${e}`)
    }
  }

  public async removeLessThen(timestamp: number): Promise<Error | null> {
    try {
      await this.knex.delete().from(this.withdrawals).where('timestamp', '<', timestamp)

      return null
    } catch (e) {
      return new KnexErr(`${e}`)
    }
  }

  public async getWithdrawalStat(): Promise<E.Either<Error, WithdrawalStat>> {
    try {
      const amount = await this.knex.raw(`select SUM(amount) as amount, COUNT(id) as total from withdrawals`)

      if (amount.length === 0) {
        return E.right({
          total: 0,
          amount: 0,
        })
      }

      return E.right({
        total: Number(amount[0].total),
        amount: Number(amount[0].amount),
      })
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }
}
