import * as E from 'fp-ts/Either'
import { expect } from '@jest/globals'
import assert from 'assert'
import { zksyncConstants } from '../src/agent'
import { SECOND_MS } from '../../common/utils/time'
import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import { createMonitorWithdrawals } from '../../common/utils/test.helpers'



describe('MonitorWithdrawals on ZkSync', () => {
  let monitorWithdrawals: MonitorWithdrawals = null as any

  beforeAll(async () => {
    ({ monitorWithdrawals } = createMonitorWithdrawals(zksyncConstants))
  })

  test(`getWithdrawalRecordsInBlockRange: 2 withdrawals (225_821 blocks)`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(39424179, 39650000)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toHaveLength(2)
  }, 20 * SECOND_MS)
})
