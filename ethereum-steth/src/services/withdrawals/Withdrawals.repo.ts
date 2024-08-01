import { either as E } from 'fp-ts'
import { Knex } from 'knex'
import { WithdrawalRequest, WithdrawalRequestSql, WithdrawalStat } from '../../entity/withdrawal_request'

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
      const data: number[] = await this.knex<number>(this.tblName).where('claimed', 0).pluck('id')
      return E.right(data)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getFinalizedRequests(): Promise<E.Either<Error, WithdrawalRequest[]>> {
    try {
      const data = await this.knex<WithdrawalRequestSql>(this.tblName).select('*').where('finalized', 1)

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
        .where('finalized', 1)
        .orderBy('id', 'desc')
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
        .where('finalized', 0)
        .orderBy('id', 'asc')
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
        return E.right(0)
      }

      return E.right(data[0])
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async getAll(): Promise<E.Either<Error, WithdrawalRequest[]>> {
    try {
      const data = await this.knex<WithdrawalRequestSql>(this.tblName).select('*')

      const out: WithdrawalRequest[] = []
      for (const r of data) {
        const wr = WithdrawalRequest.sqlToWithdrawalRequest(r)
        out.push(wr)
      }

      return E.right(out)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }

  public async setWithdrawalRequestClaimed(
    withdrawalRequestId: number,
    isClaimed: boolean,
    amountOfStETH: string,
  ): Promise<Error | null> {
    try {
      await this.knex(this.tblName)
        .where('id', withdrawalRequestId)
        .update({
          claimed: Number(isClaimed),
          amount_steth: amountOfStETH,
        })

      return null
    } catch (e) {
      return new KnexErr(`${e}`)
    }
  }

  public async setFinalizedRequests(lastRequestId: number): Promise<Error | null> {
    try {
      await this.knex(this.tblName)
        .where('id', '<=', lastRequestId)
        .update({
          finalized: Number(1),
        })

      return null
    } catch (e) {
      return new KnexErr(`${e}`)
    }
  }

  public async getStat(): Promise<E.Either<Error, WithdrawalStat>> {
    try {
      const data = await this.knex.raw(`
select IFNULL(SUM(amount_steth) filter (where finalized = 1) / pow(10, 18), 0) as finalizedSteth
     , IFNULL(SUM(amount_steth) filter (where finalized = 0) / pow(10, 18), 0) as notFinalizedSteth
     , IFNULL(SUM(amount_steth) filter (where claimed = 1) / pow(10, 18), 0)   as claimedSteth
     , IFNULL(SUM(amount_steth) filter (where claimed = 0) / pow(10, 18), 0)   as notClaimedSteth
     , IFNULL(SUM(amount_steth) / pow(10, 18), 0)                              as steth
     , COUNT(id)                                                    as total
     , COUNT(id) filter (where finalized = 1)                       as finalizedRequests
     , COUNT(id) filter (where finalized = 0)                       as notfinalizedRequests
     , COUNT(id) filter (where claimed = 1)                         as claimedRequests
     , COUNT(id) filter (where claimed = 0)                         as notClaimedRequests
from withdrawal_requests;`)

      let out: WithdrawalStat = {
        finalizedSteth: 0,
        notFinalizedSteth: 0,
        claimedSteth: 0,
        notClaimedSteth: 0,
        steth: 0,
        total: 0,
        finalizedRequests: 0,
        notfinalizedRequests: 0,
        claimedRequests: 0,
        notClaimedRequests: 0,
      }

      if (data.length === 0) {
        return E.right(out)
      }

      return E.right(data[0] as WithdrawalStat)
    } catch (e) {
      return E.left(new KnexErr(`${e}`))
    }
  }
}
