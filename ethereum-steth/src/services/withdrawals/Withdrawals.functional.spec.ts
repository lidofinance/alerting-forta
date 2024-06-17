import { getWithdrawalsEvents, WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED_EVENT } from '../../utils/events/withdrawals_events'
import { Address } from '../../utils/constants'
import BigNumber from 'bignumber.js'
import { WithdrawalsRepo } from './Withdrawals.repo'
import { either as E } from 'fp-ts'
import { BlockDto, TransactionDto } from '../../entity/events'
import { ethers } from 'ethers'
import { Finding } from '../../generated/proto/alert_pb'
import { filterLog } from 'forta-agent'
import { Config } from '../../utils/env/env'
import { knex } from 'knex'
import * as Winston from 'winston'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from '../../generated/typechain'
import { WithdrawalsSrv } from './Withdrawals.srv'
import { WithdrawalsCache } from './Withdrawals.cache'
import { ETHProvider } from '../../clients/eth_provider'
import { EtherscanProviderMock } from '../../clients/mocks/mock'

const TEST_TIMEOUT = 120_000 // ms

describe('Withdrawals.srv functional tests', () => {
  const config = new Config()
  const dbClient = knex(config.knexConfig)
  const repo = new WithdrawalsRepo(dbClient)

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const fortaEthersProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, config.chainId)

  const address: Address = Address
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, fortaEthersProvider)

  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, fortaEthersProvider)

  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.EXIT_BUS_ORACLE_ADDRESS, fortaEthersProvider)

  const ethClient = new ETHProvider(
    logger,
    fortaEthersProvider,
    EtherscanProviderMock(),
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    veboRunner,
  )

  const withdrawalsSrv = new WithdrawalsSrv(
    logger,
    new WithdrawalsRepo(dbClient),
    ethClient,
    new WithdrawalsCache(),
    getWithdrawalsEvents(address.WITHDRAWALS_QUEUE_ADDRESS),
    address.WITHDRAWALS_QUEUE_ADDRESS,
    address.LIDO_STETH_ADDRESS,
  )

  beforeAll(async () => {
    await dbClient.migrate.down()
    await dbClient.migrate.latest()
  }, TEST_TIMEOUT)

  afterAll(async () => {
    await dbClient.destroy()
  }, TEST_TIMEOUT)

  test(
    'should emit WITHDRAWALS-LONG-UNFINALIZED-QUEUE when the withdrawal queue is clogged',
    async () => {
      const blockNumber = 19_609_409
      const block = await fortaEthersProvider.getBlock(blockNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      const initErr = await withdrawalsSrv.initialize(blockNumber)
      if (initErr !== null) {
        fail(initErr.message)
      }
      const resultsBigOnly = await withdrawalsSrv.handleUnfinalizedRequestNumber(blockDto)
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
      const neededBlock = await fortaEthersProvider.getBlock(neededBlockNumber)
      const neededBlockDto: BlockDto = {
        number: neededBlock.number,
        timestamp: neededBlock.timestamp,
        parentHash: neededBlock.parentHash,
      }

      const results = await withdrawalsSrv.handleUnfinalizedRequestNumber(neededBlockDto)

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

      const trx = await fortaEthersProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
      }

      const initErr = await withdrawalsSrv.initialize(19113262)
      if (initErr !== null) {
        fail(initErr.message)
      }
      const result = await withdrawalsSrv.handleWithdrawalClaimed(transactionDto)
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
