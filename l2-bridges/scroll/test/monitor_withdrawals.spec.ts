import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import * as E from 'fp-ts/Either'
import { ethers  } from 'forta-agent'
import { expect } from '@jest/globals'
import BigNumber from 'bignumber.js'
import * as Winston from 'winston'
import { ERC20Short__factory } from '../../common/generated'
import { Constants } from '../src/constants'
import { L2Client } from '../../common/clients/l2_client'
import assert from 'assert'

const SECOND = 1000 // ms


describe('MonitorWithdrawals', () => {
  const logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const nodeClient = new ethers.providers.JsonRpcProvider(Constants.L2_NETWORK_RPC, Constants.L2_NETWORK_ID)
  const bridgedWstethRunner = ERC20Short__factory.connect(Constants.L2_WSTETH_BRIDGED.address, nodeClient)

  const l2Client = new L2Client(nodeClient, logger, bridgedWstethRunner, Constants.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)

  const monitorWithdrawals = new MonitorWithdrawals(
    l2Client, Constants.L2_ERC20_TOKEN_GATEWAY.address, logger, Constants.withdrawalInfo,
    Constants.SCROLL_APPROX_BLOCK_TIME_3_SECONDS
  )

  test(`getWithdrawalRecordsInBlockRange: 3 withdrawals, 3889 blocks`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(6608787, 6612676)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toEqual([
      {
        time: 1718529531,
        amount: new BigNumber('2557056545136494'),
      },
      {
        time: 1718531871,
        amount: new BigNumber('55285277863366'),
      },
      {
        time: 1718541199,
        amount: new BigNumber('16222703281150365'),
      },
    ])
  })

  test(`getWithdrawalRecordsInBlockRange: 25 withdrawals (51_984 blocks)`, async () => {
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(6581354, 6633338)
    assert(E.isRight(withdrawalRecords))
    expect(withdrawalRecords.right).toHaveLength(25)
  })

  xtest(`getWithdrawalRecordsInBlockRange for 1_000_000 blocks`, async () => {
    const endBlock = 6_633_338
    const startBlock = endBlock - 1_000_000
    const withdrawalRecords = await monitorWithdrawals._getWithdrawalRecordsInBlockRange(startBlock, endBlock)
    assert(E.isRight(withdrawalRecords))
  }, 20 * SECOND)
})
