import { either as E } from 'fp-ts'
import { Address, ETH_DECIMALS, GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024 } from '../utils/constants'
import { GateSeal } from '../entity/gate_seal'
import { ethers } from 'forta-agent'
import BigNumber from 'bignumber.js'
import { expect } from '@jest/globals'
import * as Winston from 'winston'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from '../generated/typechain'
import { ETHProvider } from './eth_provider'
import { Metrics } from '../utils/metrics/metrics'
import promClient from 'prom-client'
import { HISTORY_BLOCK_OFFSET } from '../services/steth_operation/StethOperation.srv'

describe('eth provider tests', () => {
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })
  const address: Address = Address
  const chainId = 1

  const fortaEthersProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, chainId)
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, fortaEthersProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, fortaEthersProvider)
  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.EXIT_BUS_ORACLE_ADDRESS, fortaEthersProvider)

  const defaultRegistry = promClient
  const prefix = 'test_'
  defaultRegistry.collectDefaultMetrics({
    prefix: prefix,
  })

  const registry = new promClient.Registry()
  const metrics = new Metrics(registry, prefix)

  const ethClient = new ETHProvider(
    logger,
    metrics,
    fortaEthersProvider,
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    veboRunner,
  )

  test('getWithdrawalStatuses should return 1750 withdrawal statuses', async () => {
    const blockNumber = 19112800
    const requestsRange: number[] = []
    for (let i = 21001; i <= 22750; i++) {
      requestsRange.push(i)
    }

    const statuses = await ethClient.getWithdrawalStatuses(requestsRange, blockNumber)
    if (E.isLeft(statuses)) {
      throw statuses.left.message
    }

    expect(statuses.right.length).toEqual(1750)
  }, 120_000)

  test('checkGateSeal should be success', async () => {
    const blockNumber = 19140476

    const resp = await ethClient.checkGateSeal(blockNumber, GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024)
    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    const expected: GateSeal = {
      roleForWithdrawalQueue: true,
      roleForExitBus: true,
      exitBusOracleAddress: '0x0de4ea0184c2ad0baca7183356aea5b8d5bf5c6e',
      withdrawalQueueAddress: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1',
    }

    expect(resp.right).toEqual(expected)
  }, 120_000)

  test('getBalanceByBlockHash is 16619.29059680177', async () => {
    const blockNumber = 19_140_476
    const block = await fortaEthersProvider.getBlock(blockNumber)
    const parentBlockHash = '0x55fdadee696dd3b08c0752c2fa5feba7abd19992fd3d2f18f9a87baa62fa34ae'
    expect(block.parentHash).toEqual(parentBlockHash)

    const parentBlock = await fortaEthersProvider.getBlock(parentBlockHash)
    expect(parentBlock.number).toEqual(blockNumber - 1)
    const resp = await ethClient.getBalanceByBlockHash(Address.WITHDRAWALS_QUEUE_ADDRESS, block.parentHash)

    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    const resp2 = new BigNumber(
      (await fortaEthersProvider.getBalance(Address.WITHDRAWALS_QUEUE_ADDRESS, blockNumber - 1)).toString(),
    )

    const expectedBalance = 16619.29059680177
    expect(resp.right.dividedBy(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
    expect(resp2.div(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
  }, 120_000)

  test('getBalanceByBlockHash is 38186.88677324665', async () => {
    const blockNumber = 19_619_102
    const block = await fortaEthersProvider.getBlock(blockNumber)
    const parentBlockHash = '0x0667f8c4447dfcac0f667cd1c6dbb2b5a6dfed35a051a44d8f512710191938a9'
    expect(block.parentHash).toEqual(parentBlockHash)

    const parentBlock = await fortaEthersProvider.getBlock(parentBlockHash)
    expect(parentBlock.number).toEqual(blockNumber - 1)
    const resp = await ethClient.getBalanceByBlockHash(Address.WITHDRAWALS_QUEUE_ADDRESS, block.parentHash)

    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    const resp2 = new BigNumber(
      (await fortaEthersProvider.getBalance(Address.WITHDRAWALS_QUEUE_ADDRESS, blockNumber - 1)).toString(),
    )

    const expectedBalance = 38186.88677324665
    expect(resp.right.dividedBy(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
    expect(resp2.div(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
  }, 120_000)

  test('getShareRate is 1.16583492875463847628', async () => {
    const blockNumber = 19_811_012
    const shareRate = await ethClient.getShareRate(blockNumber)
    if (E.isLeft(shareRate)) {
      throw shareRate.left.message
    }

    expect('1.16583492875463847628').toEqual(shareRate.right.toString())
  }, 120_000)

  test('getBlock by hash', async () => {
    const blockHash = `0x0b99aebc4925ff127f1368b4aafff11dacc051a24247c0ee4159b735ca300d49`
    const block = await ethClient.getBlockByHash(blockHash)
    if (E.isLeft(block)) {
      throw block.left.message
    }

    expect(20_160_727).toEqual(block.right.number)
  }, 120_000)

  test('getBufferedEther by blockNumber', async () => {
    const blockNumber = 20_160_727
    const bufferedEther = await ethClient.getBufferedEther(blockNumber)
    if (E.isLeft(bufferedEther)) {
      throw bufferedEther.left.message
    }

    expect(6016.430655102903).toEqual(bufferedEther.right.dividedBy(ETH_DECIMALS).toNumber())
  }, 120_000)

  test('getChainBlocks by hash', async () => {
    const parentHash = `0x0b99aebc4925ff127f1368b4aafff11dacc051a24247c0ee4159b735ca300d49`
    const chain = await ethClient.getChainPrevBlocks(parentHash, 4)
    if (E.isLeft(chain)) {
      throw chain.left.message
    }

    expect(chain.right[3].hash).toEqual(parentHash)
    expect(chain.right[0].number).toEqual(20_160_724)
    expect(chain.right[1].number).toEqual(20_160_725)
    expect(chain.right[2].number).toEqual(20_160_726)
    expect(chain.right[3].number).toEqual(20_160_727)

    expect(chain.right[0].hash).toEqual(chain.right[1].parentHash)
    expect(chain.right[1].hash).toEqual(chain.right[2].parentHash)
    expect(chain.right[2].hash).toEqual(chain.right[3].parentHash)
  }, 120_000)

  test('getETHDistributedEvent', async () => {
    const currBlock = 20_211_671
    const events = await ethClient.getETHDistributedEvents(currBlock, currBlock)
    if (E.isLeft(events)) {
      throw events.left.message
    }

    expect(events.right.length).toEqual(1)
  }, 120_000)

  test('getUnbufferedEvents', async () => {
    const currBlock = 20_212_690
    const events = await ethClient.getUnbufferedEvents(currBlock - HISTORY_BLOCK_OFFSET, currBlock)
    if (E.isLeft(events)) {
      throw events.left.message
    }

    const latestDepositBlock = await ethClient.getBlockByNumber(events.right[events.right.length - 1].blockNumber)
    if (E.isLeft(latestDepositBlock)) {
      throw latestDepositBlock.left
    }

    const expectedBlockNumber = 20190032
    const expectedTimestamp = 1719575867

    expect(latestDepositBlock.right.number).toEqual(expectedBlockNumber)
    expect(latestDepositBlock.right.timestamp).toEqual(expectedTimestamp)
  }, 120_000)

  test('getStethBalance', async () => {
    const currBlock = 20_218_548

    const stBalance = await ethClient.getStethBalance(address.LIDO_STETH_ADDRESS, currBlock)
    if (E.isLeft(stBalance)) {
      throw stBalance.left.message
    }

    logger.info(stBalance.right.div(ETH_DECIMALS).toNumber())
  }, 120_000)
})
