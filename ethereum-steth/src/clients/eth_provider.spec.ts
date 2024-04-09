import { App } from '../app'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../utils/constants'
import { GateSeal } from '../entity/gate_seal'
import { JsonRpcProvider } from '@ethersproject/providers'
import { ethers } from 'forta-agent'

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

    const resp = await app.ethClient.checkGateSeal(blockNumber, Address.GATE_SEAL_DEFAULT_ADDRESS)
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

  test('getBalanceByBlockHash is ok', async () => {
    const app = await App.getInstance(drpcProvider)

    const blockNumber = 19_140_476
    const block = await ethProvider.getBlock(blockNumber)

    const resp = await app.ethClient.getBalanceByBlockHash(Address.WITHDRAWALS_QUEUE_ADDRESS, block.parentHash)
    if (E.isLeft(resp)) {
      throw resp.left.message
    }

    expect(resp.right.dividedBy(ETH_DECIMALS).toNumber()).toEqual(16_619.29059680177)
  }, 120_000)
})
