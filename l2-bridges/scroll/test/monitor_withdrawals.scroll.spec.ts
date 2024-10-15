import * as E from 'fp-ts/Either'
import assert from 'assert'
import { expect } from '@jest/globals'

import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import { scrollConstants } from '../src/agent'
import { createMonitorWithdrawals } from '../../common/utils/test.helpers'
import { SECOND_MS } from '../../common/utils/time'


describe('MonitorWithdrawals on Scroll', () => {
  let monitorWithdrawals: MonitorWithdrawals = null as any

  beforeAll(async () => {
    ({ monitorWithdrawals } = createMonitorWithdrawals({
      ...scrollConstants,
      // Commented because fork is not needed for these tests
      // L2_NETWORK_RPC: globalExtended.testNodes[L2Network.Scroll].rpcUrl,
  }))
  })

  test(`getWithdrawalRecordsInBlockRange: 3 withdrawals, 3889 blocks`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(6608787, 6612676)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toEqual([
      {
        time: 1718529531,
        amount: 2557056545136494n,
      },
      {
        time: 1718531871,
        amount: 55285277863366n,
      },
      {
        time: 1718541199,
        amount: 16222703281150365n,
      },
    ])
  }, 20 * SECOND_MS)

  test(`getWithdrawalRecordsInBlockRange: 25 withdrawals (51_984 blocks)`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(6581354, 6633338)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toHaveLength(25)
  }, 40 * SECOND_MS)
})
