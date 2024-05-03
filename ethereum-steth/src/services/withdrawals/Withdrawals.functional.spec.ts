import { App, Container } from '../../app'
import { WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT } from '../../utils/events/withdrawals_events'
import { Address } from '../../utils/constants'
import BigNumber from 'bignumber.js'
import { WithdrawalsRepo } from './Withdrawals.repo'
import * as E from 'fp-ts/Either'
import { BlockDto, TransactionDto } from '../../entity/events'
import { JsonRpcProvider } from '@ethersproject/providers'
import { ethers } from 'ethers'
import { Finding } from '../../generated/proto/alert_pb'
import { filterLog } from 'forta-agent'

const TEST_TIMEOUT = 120_000 // ms

describe('Withdrawals.srv functional tests', () => {
  let ethProvider: JsonRpcProvider
  const mainnet = 1
  const drpcProvider = 'https://eth.drpc.org/'

  beforeAll(async () => {
    ethProvider = new ethers.providers.JsonRpcProvider(drpcProvider, mainnet)
  })

  let app: Container
  let repo: WithdrawalsRepo

  beforeAll(async () => {
    app = await App.getInstance()

    await app.db.migrate.down()
    await app.db.migrate.latest()

    repo = new WithdrawalsRepo(app.db)
  }, TEST_TIMEOUT)

  afterAll(async () => {
    await app.db.destroy()
  }, TEST_TIMEOUT)

  test(
    'should emit WITHDRAWALS-LONG-UNFINALIZED-QUEUE when the withdrawal queue is clogged',
    async () => {
      const app = await App.getInstance()

      const blockNumber = 19_609_409
      const block = await ethProvider.getBlock(blockNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      const initErr = await app.WithdrawalsSrv.initialize(blockNumber)
      if (initErr !== null) {
        fail(initErr.message)
      }
      const resultsBigOnly = await app.WithdrawalsSrv.handleUnfinalizedRequestNumber(blockDto)
      expect(resultsBigOnly.length).toEqual(1)

      const expectedBig = {
        alertId: 'WITHDRAWALS-BIG-UNFINALIZED-QUEUE',
        description: 'Unfinalized queue is 140275.70 stETH',
        name: '⚠️ Withdrawals: unfinalized queue is more than 100000 stETH',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.INFORMATION,
      }

      expect(resultsBigOnly.length).toEqual(1)
      expect(resultsBigOnly[0].getAlertid()).toEqual(expectedBig.alertId)
      expect(resultsBigOnly[0].getDescription()).toEqual(expectedBig.description)
      expect(resultsBigOnly[0].getName()).toEqual(expectedBig.name)
      expect(resultsBigOnly[0].getSeverity()).toEqual(expectedBig.severity)
      expect(resultsBigOnly[0].getType()).toEqual(expectedBig.type)

      const neededBlockNumber = 19_609_410
      const neededBlock = await ethProvider.getBlock(neededBlockNumber)
      const neededBlockDto: BlockDto = {
        number: neededBlock.number,
        timestamp: neededBlock.timestamp,
        parentHash: neededBlock.parentHash,
      }

      const results = await app.WithdrawalsSrv.handleUnfinalizedRequestNumber(neededBlockDto)

      const expectedLong = {
        alertId: 'WITHDRAWALS-LONG-UNFINALIZED-QUEUE',
        description: 'Withdrawal request #33321 has been waiting for 120 hrs 12 sec at the moment',
        name: '⚠️ Withdrawals: unfinalized queue wait time is more than 5 days',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.INFORMATION,
      }

      expect(results.length).toEqual(1)
      expect(results[0].getAlertid()).toEqual(expectedLong.alertId)
      expect(results[0].getDescription()).toEqual(expectedLong.description)
      expect(results[0].getName()).toEqual(expectedLong.name)
      expect(results[0].getSeverity()).toEqual(expectedLong.severity)
      expect(results[0].getType()).toEqual(expectedLong.type)
    },
    TEST_TIMEOUT,
  )

  test(
    'should not return WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED',
    async () => {
      const txHash = '0xdf4c31a9886fc4269bfef601c6d0a287633d516d16d61d5b62b9341e704eb52c'

      const trx = await ethProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
      }

      const initErr = await app.WithdrawalsSrv.initialize(19113262)
      if (initErr !== null) {
        fail(initErr.message)
      }
      const result = await app.WithdrawalsSrv.handleWithdrawalClaimed(transactionDto)
      expect(result.length).toEqual(0)

      const requestID = 24651
      const wr = await repo.getById(requestID)
      if (E.isLeft(wr)) {
        throw wr.left
      }

      const claimedEvents = filterLog(
        transactionDto.logs,
        WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT,
        Address.WITHDRAWALS_QUEUE_ADDRESS,
      )

      expect(claimedEvents[0].args.owner).toEqual(wr.right.owner)
      expect(claimedEvents[0].args.requestId.toNumber()).toEqual(wr.right.id)
      expect(new BigNumber(claimedEvents[0].args.amountOfETH.toString())).toEqual(wr.right.amountOfStETH)
    },
    TEST_TIMEOUT,
  )
})
