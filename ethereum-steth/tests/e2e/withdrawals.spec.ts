import { ethers, filterLog, getEthersProvider, Network, Transaction } from 'forta-agent'
import { App, Container } from '../../src/app'
import { createTransactionEvent } from './utils'
import { WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT } from '../../src/utils/events/withdrawals_events'
import { Address } from '../../src/utils/constants'
import BigNumber from 'bignumber.js'
import { WithdrawalsRepo } from '../../src/services/withdrawals/Withdrawals.repo'
import * as E from 'fp-ts/Either'

const timeout = 120_000

describe('Withdrawals srv e2e tests', () => {
  const ethProvider = getEthersProvider()
  let app: Container
  let repo: WithdrawalsRepo

  beforeAll(async () => {
    app = await App.getInstance()

    await app.db.migrate.down()
    await app.db.migrate.latest()

    repo = new WithdrawalsRepo(app.db)
  }, timeout)

  afterAll(async () => {
    await app.db.destroy()
  }, timeout)

  test(
    'should not return WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED',
    async () => {
      const txHash = '0xdf4c31a9886fc4269bfef601c6d0a287633d516d16d61d5b62b9341e704eb52c'

      const receipt = await ethProvider.send('eth_getTransactionReceipt', [txHash])
      const block = await ethProvider.send('eth_getBlockByNumber', [
        ethers.utils.hexValue(parseInt(receipt.blockNumber)),
        true,
      ])
      const transaction = block.transactions.find((tx: Transaction) => tx.hash.toLowerCase() === txHash)!
      const txEvent = createTransactionEvent(transaction, block, Network.MAINNET, [], receipt.logs)

      const initErr = await app.WithdrawalsSrv.initialize(19113262)
      if (initErr !== null) {
        fail(initErr.message)
      }
      const result = await app.WithdrawalsSrv.handleWithdrawalClaimed(txEvent)
      expect(result.length).toEqual(0)

      const requestID = 24651
      const wr = await repo.getById(requestID)
      if (E.isLeft(wr)) {
        throw wr.left
      }

      const claimedEvents = filterLog(
        txEvent.logs,
        WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT,
        Address.WITHDRAWALS_QUEUE_ADDRESS,
      )

      expect(claimedEvents[0].args.owner).toEqual(wr.right.owner)
      expect(claimedEvents[0].args.requestId.toNumber()).toEqual(wr.right.id)
      expect(new BigNumber(claimedEvents[0].args.amountOfETH.toString())).toEqual(wr.right.amountOfStETH)
    },
    timeout,
  )
})
