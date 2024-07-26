import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import * as E from 'fp-ts/Either'
import { ethers  } from 'forta-agent'
import { expect } from '@jest/globals'
import BigNumber from 'bignumber.js'
import * as Winston from 'winston'
import { ERC20Short__factory } from '../../common/generated'
import { mantleConstants } from '../src/agent'
import { L2Client } from '../../common/clients/l2_client'
import assert from 'assert'

const SECOND = 1000 // ms


describe('MonitorWithdrawals', () => {
  const logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const nodeClient = new ethers.providers.JsonRpcProvider(mantleConstants.L2_NETWORK_RPC, mantleConstants.L2_NETWORK_ID)
  const bridgedWstethRunner = ERC20Short__factory.connect(mantleConstants.L2_WSTETH_BRIDGED.address, nodeClient)
  const l2Client = new L2Client(nodeClient, logger, bridgedWstethRunner, mantleConstants.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)
  const monitorWithdrawals = new MonitorWithdrawals(l2Client, logger, mantleConstants)

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
  }, 20 * SECOND)
})
