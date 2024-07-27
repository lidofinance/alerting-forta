import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import * as E from 'fp-ts/Either'
import { expect } from '@jest/globals'
import BigNumber from 'bignumber.js'
import { mantleConstants } from '../src/agent'
import { SECOND_MS } from '../../common/utils/time'
import assert from 'assert'
import { spawnTestNode, stopTestNode, createMonitorWithdrawals } from '../../common/utils/test.helpers'


describe('MonitorWithdrawals on Mantle', () => {
  let testNodeProcess: any = null
  let monitorWithdrawals: MonitorWithdrawals = null as any

  beforeAll(async () => {
    const { nodeProcess, rpcUrl } = await spawnTestNode(mantleConstants.L2_NETWORK_ID, mantleConstants.L2_NETWORK_RPC)
    testNodeProcess = nodeProcess
    mantleConstants.L2_NETWORK_RPC = rpcUrl

    monitorWithdrawals = createMonitorWithdrawals(mantleConstants)
  });

  test(`getWithdrawalRecordsInBlockRange: 2 withdrawals, 1_023_599 blocks`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(64995881, 66019480)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toEqual([
      {
        time: 1718122074,
        amount: new BigNumber('337496585884301715'),
      },
      {
        time: 1720169272,
        amount: new BigNumber('2107828861318592904'),
      },
    ])
  }, 20 * SECOND_MS)

  afterAll(async () => {
    await stopTestNode(testNodeProcess)
  });
})
