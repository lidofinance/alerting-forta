import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import * as E from 'fp-ts/Either'
import { ethers  } from 'forta-agent'
import { expect } from '@jest/globals'
import * as Winston from 'winston'
import { ERC20Short__factory } from '../../common/generated'
import { zksyncConstants } from '../src/agent'
import { L2Client } from '../../common/clients/l2_client'
import assert from 'assert'

const SECOND = 1000 // ms


describe('MonitorWithdrawals', () => {
  const logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const nodeClient = new ethers.providers.JsonRpcProvider(zksyncConstants.L2_NETWORK_RPC, zksyncConstants.L2_NETWORK_ID)
  const bridgedWstethRunner = ERC20Short__factory.connect(zksyncConstants.L2_WSTETH_BRIDGED.address, nodeClient)

  const l2Client = new L2Client(nodeClient, logger, bridgedWstethRunner, zksyncConstants.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)

  const monitorWithdrawals = new MonitorWithdrawals(l2Client, logger, zksyncConstants)

  test(`getWithdrawalRecordsInBlockRange: 2 withdrawals (225_821 blocks)`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(39424179, 39650000)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toHaveLength(2)
  }, 20 * SECOND)

})
