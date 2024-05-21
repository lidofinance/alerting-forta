import { App } from '../app'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS, GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024 } from '../utils/constants'
import { GateSeal } from '../entity/gate_seal'
import { JsonRpcProvider } from '@ethersproject/providers'
import { ethers } from 'forta-agent'
import BigNumber from 'bignumber.js'

describe('eth provider tests', () => {
  let ethProvider: JsonRpcProvider
  const mainnet = 1
  const drpcProvider = 'https://eth.drpc.org/'

  beforeAll(async () => {
    ethProvider = new ethers.providers.JsonRpcProvider(drpcProvider, mainnet)
  })

  test('getWithdrawalStatuses should return 1750 withdrawal statuses', async () => {
    const app = await App.getInstance(drpcProvider)

    const blockNumber = 19112800
    const requestsRange: number[] = []
    for (let i = 21001; i <= 22750; i++) {
      requestsRange.push(i)
    }

    const statuses = await app.ethClient.getWithdrawalStatuses(requestsRange, blockNumber)
    if (E.isLeft(statuses)) {
      throw statuses.left.message
    }

    expect(statuses.right.length).toEqual(1750)
  }, 120_000)

  test('checkGateSeal should be success', async () => {
    const app = await App.getInstance(drpcProvider)

    const blockNumber = 19140476

    const resp = await app.ethClient.checkGateSeal(blockNumber, GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024)
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
    const app = await App.getInstance(drpcProvider)

    const blockNumber = 19_140_476
    const block = await ethProvider.getBlock(blockNumber)
    const parentBlockHash = '0x55fdadee696dd3b08c0752c2fa5feba7abd19992fd3d2f18f9a87baa62fa34ae'
    expect(block.parentHash).toEqual(parentBlockHash)

    const parentBlock = await ethProvider.getBlock(parentBlockHash)
    expect(parentBlock.number).toEqual(blockNumber - 1)
    const resp = await app.ethClient.getBalanceByBlockHash(Address.WITHDRAWALS_QUEUE_ADDRESS, block.parentHash)

    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    const resp2 = new BigNumber(
      (await ethProvider.getBalance(Address.WITHDRAWALS_QUEUE_ADDRESS, blockNumber - 1)).toString(),
    )

    const expectedBalance = 16619.29059680177
    expect(resp.right.dividedBy(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
    expect(resp2.div(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
  }, 120_000)

  test('getBalanceByBlockHash is 38186.88677324665', async () => {
    const app = await App.getInstance(drpcProvider)

    const blockNumber = 19_619_102
    const block = await ethProvider.getBlock(blockNumber)
    const parentBlockHash = '0x0667f8c4447dfcac0f667cd1c6dbb2b5a6dfed35a051a44d8f512710191938a9'
    expect(block.parentHash).toEqual(parentBlockHash)

    const parentBlock = await ethProvider.getBlock(parentBlockHash)
    expect(parentBlock.number).toEqual(blockNumber - 1)
    const resp = await app.ethClient.getBalanceByBlockHash(Address.WITHDRAWALS_QUEUE_ADDRESS, block.parentHash)

    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    const resp2 = new BigNumber(
      (await ethProvider.getBalance(Address.WITHDRAWALS_QUEUE_ADDRESS, blockNumber - 1)).toString(),
    )

    const expectedBalance = 38186.88677324665
    expect(resp.right.dividedBy(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
    expect(resp2.div(ETH_DECIMALS).toNumber()).toEqual(expectedBalance)
  }, 120_000)
})
