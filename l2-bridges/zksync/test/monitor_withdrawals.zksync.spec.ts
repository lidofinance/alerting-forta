import * as E from 'fp-ts/Either'
import { expect } from '@jest/globals'
import { zksyncConstants } from '../src/agent'
import { SECOND_MS } from '../../common/utils/time'
import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import { spawnTestNode, stopTestNode, createMonitorWithdrawals } from '../../common/utils/test.helpers'
import assert from 'assert'


describe('MonitorWithdrawals on ZkSync', () => {
  let testNodeProcess: any = null
  let monitorWithdrawals: MonitorWithdrawals = null as any

  beforeAll(async () => {
    const { nodeProcess, rpcUrl } = await spawnTestNode(zksyncConstants.L2_NETWORK_ID, zksyncConstants.L2_NETWORK_RPC)
    testNodeProcess = nodeProcess
    zksyncConstants.L2_NETWORK_RPC = rpcUrl

    monitorWithdrawals = createMonitorWithdrawals(zksyncConstants)
  });

  test(`getWithdrawalRecordsInBlockRange: 2 withdrawals (225_821 blocks)`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(39424179, 39650000)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toHaveLength(2)
  }, 20 * SECOND_MS)

  afterAll(async () => {
    await stopTestNode(testNodeProcess)
  });
})
