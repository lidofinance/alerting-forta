import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { StonksSrv } from './Stonks.srv'
import { BlockEvent, ethers, FindingSeverity, LogDescription } from 'forta-agent'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import mocked = jest.mocked
import { BigNumber } from 'ethers'
import { faker } from '@faker-js/faker'
import { STETH_MAX_PRECISION, STONKS, STONKS_ORDER_CREATED_EVENT } from '../../utils/constants/stonks/mainnet'
import { TypedEvent } from '../../generated/common'

describe('StonksSrv', () => {
  let logger: Logger
  let ethProvider: ETHProvider
  let stonksSrv: StonksSrv
  const blockEvent = { blockNumber: 100, block: { timestamp: 100000 } } as BlockEvent

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = {
      getBlock: jest.fn(),
      getStonksOrderParams: jest.fn(),
      getStonksOrderEvents: jest.fn(),
      getOrderBalance: jest.fn(),
    } as unknown as ETHProvider
    stonksSrv = new StonksSrv(logger, ethProvider)
    mocked(ethProvider.getBlock).mockResolvedValue(
      E.right({ number: 1000, timestamp: 10000 } as unknown as ethers.providers.Block),
    )
  })

  it('initializes and loads stonks contracts', async () => {
    mocked(ethProvider.getStonksOrderEvents).mockResolvedValue(E.right([]))
    mocked(ethProvider.getStonksOrderParams).mockResolvedValue(E.right(['0x123', '1000', BigNumber.from(100)]))

    await expect(stonksSrv.initialize(100)).resolves.not.toThrow()
  })

  it('fails on initialize if getStonksOrderEvents fails', async () => {
    const errMsg = faker.lorem.sentence()
    mocked(ethProvider.getStonksOrderEvents).mockResolvedValue(E.left(new Error(errMsg)))

    await expect(stonksSrv.initialize(100)).rejects.toThrow(
      new Error(`Could not initialize StonksSrv. Cause: Could not load created orders. Cause: Error: ${errMsg}`),
    )
  })

  it('fails on initialize if getStonksOrderParams fails', async () => {
    const errMsg = faker.lorem.sentence()
    mocked(ethProvider.getStonksOrderEvents).mockResolvedValue(E.right([]))
    mocked(ethProvider.getStonksOrderParams).mockResolvedValue(E.left(new Error(errMsg)))

    await expect(stonksSrv.initialize(100)).rejects.toThrow(
      new Error(
        `Could not initialize StonksSrv. Cause: Could not load created orders. Cause: Error: Could not get tokenFrom or orderDuration for ${STONKS[0].address}`,
      ),
    )
  })

  it('returns the correct name', () => {
    expect(stonksSrv.getName()).toBe('StonksSrv')
  })

  it('handles block without error', async () => {
    await expect(stonksSrv.handleBlock(blockEvent)).resolves.not.toThrow()
  })

  it('handles transaction without error', async () => {
    const txEvent = { addresses: { '0x123': true }, filterLog: jest.fn() } as unknown as TransactionEvent

    await expect(stonksSrv.handleTransaction(txEvent)).resolves.not.toThrow()
  })

  it.each([
    {
      name: 'order fulfilled',
      orderBalance: STETH_MAX_PRECISION.minus(10),
      expectedName: '✅ Stonks: order fulfill',
      expectedDescription: 'Stonks order [0x123](https://etherscan.io/address/0x123) was fulfill',
      expectedAlertId: 'STONKS-ORDER-FULFILL',
    },
    {
      name: 'order expired',
      orderBalance: STETH_MAX_PRECISION.plus(10000),
      expectedName: '❌ Stonks: order expired',
      expectedDescription: 'Stonks order [0x123](https://etherscan.io/address/0x123) was expired',
      expectedAlertId: 'STONKS-ORDER-EXPIRED',
    },
  ])(
    'handles orders created on init in case of $name',
    async ({ orderBalance, expectedName, expectedDescription, expectedAlertId }) => {
      const event: TypedEvent = {
        event: STONKS_ORDER_CREATED_EVENT,
        getBlock: jest.fn(),
        args: { orderContract: '0x123' },
      } as unknown as TypedEvent
      mocked(event.getBlock).mockResolvedValue({ timestamp: 1000 } as ethers.providers.Block)
      mocked(ethProvider.getStonksOrderEvents).mockResolvedValue(E.right([event]))
      mocked(ethProvider.getStonksOrderParams).mockResolvedValue(E.right(['0x123', '1000', BigNumber.from(10000)]))
      mocked(ethProvider.getOrderBalance).mockResolvedValue(E.right(BigNumber.from(orderBalance.toString())))
      await stonksSrv.initialize(100)

      const findings = await stonksSrv.handleOrderSettlement(blockEvent)

      expect(findings).toHaveLength(STONKS.length)
      expect(findings[0]).toMatchObject({
        alertId: expectedAlertId,
        name: expectedName,
        description: expectedDescription,
        severity: FindingSeverity.Info,
      })
    },
  )

  it('creates order, stores it in memory and makes finding about it', async () => {
    const txEvent = {
      addresses: { [STONKS[0].address.toLowerCase()]: true },
      block: { timestamp: 1000 },
      filterLog: jest.fn(),
    } as unknown as TransactionEvent
    mocked(txEvent.filterLog).mockReturnValue([{ args: '0x1234,165432462576' } as unknown as LogDescription])
    mocked(ethProvider.getStonksOrderParams).mockResolvedValue(E.right(['0x123', '1000', BigNumber.from(10000)]))
    mocked(ethProvider.getOrderBalance).mockResolvedValue(E.right(BigNumber.from(100000)))

    await expect(stonksSrv.handleOrderCreation(txEvent)).resolves.not.toThrow()
    const findings = await stonksSrv.handleOrderSettlement(blockEvent)

    expect(findings).toHaveLength(1)
  })
})
