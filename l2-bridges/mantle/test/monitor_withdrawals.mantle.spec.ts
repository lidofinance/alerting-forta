import { MonitorWithdrawals } from '../../common/services/monitor_withdrawals'
import { ethers } from 'ethers'
import * as E from 'fp-ts/Either'
import { expect } from '@jest/globals'
import BigNumber from 'bignumber.js'
import { mantleConstants } from '../src/agent'
import { SECOND_MS } from '../../common/utils/time'
import assert from 'assert'
import { spawnTestNode, stopTestNode, createMonitorWithdrawals } from '../../common/utils/test.helpers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { withdrawWsteth } from './mantle.test.helpers'
import { L2Client } from '../../common/clients/l2_client'
import { MAX_WITHDRAWALS_SUM } from '../../common/services/monitor_withdrawals'
import { App } from "../../common/agent"
import { BlockEvent, EventType, Network, Block } from "forta-agent"


describe('MonitorWithdrawals on Mantle', () => {
  let testNodeProcess: any = null
  let monitorWithdrawals: MonitorWithdrawals = null as any

  let provider: JsonRpcProvider = null as any
  let l2Client: L2Client = null as any

  beforeAll(async () => {
    const { nodeProcess, rpcUrl } = await spawnTestNode(mantleConstants.L2_NETWORK_ID, mantleConstants.L2_NETWORK_RPC)
    testNodeProcess = nodeProcess
    mantleConstants.L2_NETWORK_RPC = rpcUrl;

    ({ monitorWithdrawals, provider, l2Client } = createMonitorWithdrawals(mantleConstants))
  });

  xtest(`TODO`, async () => {
    let initialize = App.initialize(mantleConstants)
    await initialize()
    let app = await App.getInstance()

    const currentL2Block = await app.provider.getBlock('latest')
    console.debug({ currentL2Block })

    const blockEvent = new BlockEvent(EventType.BLOCK, Network.MAINNET, {
      blockNumber: currentL2Block.number,
      block: {
        number: currentL2Block.number,
      }
    } as unknown as Block)
    console.debug({ blockEvent })
    console.debug({ blockEventNUmber: blockEvent.blockNumber })
    // await App.handleBlock(blockEvent)
  })

  test(`mvp of a test with emulation: max withdrawals`, async () => {
    const currentL2Block = await provider.getBlock('latest')
    await monitorWithdrawals.initialize(currentL2Block.number) // TODO: use return value of initialize

    await l2Client.getNotYetProcessedL2Blocks()

    const arbitrarySender = '0x61ce1F6514C651C39964961DB1948C6f70a4747a'
    await withdrawWsteth(ethers.utils.parseEther(`${MAX_WITHDRAWALS_SUM}`), mantleConstants, provider, arbitrarySender)
    await provider.send("hardhat_mine", ["0x09"]) // mine a few so that there are at least 10 block to trigger (% 10 == 0) condition in MonitorWithdrawals

    const l2BlocksDtoOrErr = await l2Client.getNotYetProcessedL2Blocks()
    assert(E.isRight(l2BlocksDtoOrErr))
    const l2BlocksDto = l2BlocksDtoOrErr.right

    const l2LogsOrErr = await l2Client.getL2LogsOrNetworkAlert(l2BlocksDto)
    assert(E.isRight(l2LogsOrErr))
    const l2Logs = l2LogsOrErr.right

    const findings = await monitorWithdrawals.handleBlocks(l2Logs, l2BlocksDto)
    assert(findings.length >= 1)

    await new Promise((r) => setTimeout(r, SECOND_MS)) // TODO: get rid of this

    assert(true)
  }, 40 * SECOND_MS)

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
