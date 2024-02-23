import { Knex } from 'knex'
import { WithdrawalRequest, WithdrawalRequestSql } from '../../entity/withdrawal_request'
import * as E from 'fp-ts/Either'

export const KnexErr = Error
export const NotFound = new Error('Not found')

export class WithdrawalsRepo {
  private readonly tblName = 'withdrawal_requests'
  private readonly knex: Knex

  constructor(knex: Knex) {
    this.knex = knex
  }

  public async createOrUpdate(requests: WithdrawalRequest[]): Promise<Error | null> {
    const data: WithdrawalRequestSql[] = []

    for (const r of requests) {
      data.push(r.toSqlObject())
    }

    const trx = await this.knex.transaction()

    try {
      const chunkSize = 100
      for (let i = 0; i < data.length; i += chunkSize) {
        await trx
          .insert(data.slice(i, i + chunkSize))
          .into(this.tblName)
          .onConflict('id')
          .merge()
      }

      await trx.commit()
      return null
    } catch (e) {
      await trx.rollback()
      return new KnexErr(`${e}`)
    }
  }

  public async getById(requestId: number): Promise<E.Either<Error, WithdrawalRequest>> {
    try {
      const data = await this.knex<WithdrawalRequestSql>(this.tblName).where('id', requestId).select('*').limit(1)

      if (data.length === 0) {
        return E.left(NotFound)
      }

      return E.right(WithdrawalRequest.sqlToWithdrawalRequest(data[0]))
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getUnclaimedReqIds(): Promise<E.Either<Error, number[]>> {
    try {
      const data: number[] = await this.knex<number>(this.tblName).where('isClaimed', 0).pluck('id')
      return E.right(data)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getFinalizedRequests(): Promise<E.Either<Error, WithdrawalRequest[]>> {
    try {
      const data = await this.knex<WithdrawalRequestSql>(this.tblName).select('*').where('isFinalized', 1)

      const out: WithdrawalRequest[] = []
      for (const wr of data) {
        out.push(WithdrawalRequest.sqlToWithdrawalRequest(wr))
      }

      return E.right(out)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async removeByIds(ids: number[]): Promise<Error | null> {
    const trx = await this.knex.transaction()

    try {
      const chunkSize = 100
      for (let i = 0; i < ids.length; i += chunkSize) {
        await trx(this.tblName)
          .whereIn('id', ids.slice(i, i + chunkSize))
          .delete()
      }

      await trx.commit()
      return null
    } catch (e) {
      await trx.rollback()
      return new KnexErr(`${e}`)
    }
  }

  public async getLastFinalizedRequest(): Promise<E.Either<Error, WithdrawalRequest>> {
    try {
      const data = await this.knex<WithdrawalRequestSql>(this.tblName)
        .where('isFinalized', 1)
        .orderBy('timestamp', 'desc')
        .limit(1)

      if (data.length === 0) {
        return E.left(NotFound)
      }

      return E.right(WithdrawalRequest.sqlToWithdrawalRequest(data[0]))
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getFirstUnfinalizedRequest(): Promise<E.Either<Error, WithdrawalRequest>> {
    try {
      const data = await this.knex<WithdrawalRequestSql>(this.tblName)
        .where('isFinalized', 0)
        .orderBy('timestamp', 'asc')
        .limit(1)

      if (data.length === 0) {
        return E.left(NotFound)
      }

      return E.right(WithdrawalRequest.sqlToWithdrawalRequest(data[0]))
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getRequestMapByIds(requestIds: number[]): Promise<E.Either<Error, Map<number, WithdrawalRequest>>> {
    try {
      const data = await this.knex<WithdrawalRequestSql>(this.tblName).whereIn('id', requestIds).select('*')

      const out = new Map<number, WithdrawalRequest>()
      for (const wr of data) {
        out.set(wr.id, WithdrawalRequest.sqlToWithdrawalRequest(wr))
      }

      return E.right(out)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getLastRequestId(): Promise<E.Either<Error, number>> {
    try {
      const data: number[] = await this.knex<WithdrawalRequestSql>(this.tblName)
        .orderBy('id', 'desc')
        .pluck('id')
        .limit(1)

      if (data.length === 0) {
        return E.left(NotFound)
      }

      return E.right(data[0])
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }
}
