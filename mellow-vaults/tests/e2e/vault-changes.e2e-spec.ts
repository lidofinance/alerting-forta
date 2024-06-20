import { ethers, Finding, getEthersProvider, Network, Transaction } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'

import { App } from '../../src/app'
import { createTransactionEvent, etherBlockToFortaBlockEvent } from './utils'

const TEST_TIMEOUT = 60_000 // ms

describe('vault-acl-changes e2e tests', () => {
  let ethProvider: JsonRpcProvider
  // let getRoleMembers: (address: string, hash: string, currentBlock: BlockTag) => Promise<E.Either<Error, string[]>>
  let runTransaction: (txHash: string, initBlock?: number) => Promise<Finding[]>
  let runBlock: (blockHashOrNumber: string | number, initBlock?: number) => Promise<Finding[]>
  let logSpy: jest.SpyInstance
  let timeSpy: jest.SpyInstance

  beforeAll(() => {
    ethProvider = getEthersProvider()

    logSpy = jest.spyOn(console, 'log')
    logSpy.mockImplementation(() => {})
    timeSpy = jest.spyOn(Date, 'now')
    timeSpy.mockImplementation(() => new Date('2023-12-31'))

    runTransaction = async (txHash: string, initBlock?: number) => {
      const app = await App.getInstance()

      const receipt = await ethProvider.send('eth_getTransactionReceipt', [txHash])
      const block = await ethProvider.send('eth_getBlockByNumber', [
        ethers.utils.hexValue(parseInt(receipt.blockNumber)),
        true,
      ])
      const transaction = block.transactions.find((tx: Transaction) => tx.hash.toLowerCase() === txHash)!
      if (initBlock) {
        await app.VaultWatcherSrv.initialize(initBlock)
      }

      const txEvent = createTransactionEvent(transaction, block, Network.MAINNET, [], receipt.logs)

      return app.VaultWatcherSrv.handleTransaction(txEvent)
    }

    runBlock = async (blockHashOrNumber, initBlock) => {
      const app = await App.getInstance()

      const blockNumber = initBlock
      const block = await ethProvider.getBlock(blockHashOrNumber)
      if (blockNumber) {
        await app.VaultWatcherSrv.initialize(blockNumber)
      }
      const blockEvent = etherBlockToFortaBlockEvent(block)
      return app.VaultWatcherSrv.handleBlock(blockEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should RoleRevokedRoleRevoked',
    async () => {
      const findings = await runTransaction('0xb8b96ee47cadb80ec41dafceba1fe5b10b1d50b75e7ad9114ee16180bda2d2b4')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should RoleGranted',
    async () => {
      const findings = await runTransaction('0x28cbf0521b4e6c03bf719cf958516609b3bf678b2f20dc958ae2db8999345fc5')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should RoleAdminChanged (3+2)',
    async () => {
      const findings = await runTransaction('0x047e8dd86f2e58fd05630e3fa1d1b1ce4a7638e3138cf9762894cf99a4fcabe6')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should be not slot changes',
    async () => {
      const findings = await runTransaction(
        '0xffef3e8046d882ccd5773582438ebf6576e4093dec734ed27e0f5065d1a89d7b',
        20061165,
      )
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should everything is fine',
    async () => {
      const findings = await runBlock(20061165, 20061166)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with Added Owner and Execution Success',
    async () => {
      const findings = await runTransaction('0x4c3e507fd78daac24dd75e33e7c69381481db8bce62c795d2eec67126ad6d396')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
  it(
    'should process tx with Changed Threshold and Execution Success',
    async () => {
      const findings = await runTransaction('0xb58e9e81ad1dac1f33b9dfc4d19f2d909a2a3ea890c31aa27a0df10f86bd4eea')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
  it(
    'should withdrawal',
    async () => {
      const findings = await runTransaction('0x17c222325fa85abc5a0e74708264c751cbf54e6f06fdfd852d520e3bee1b0596')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should should find 1 withdrawal',
    async () => {
      const findings = await runBlock(20109999, 20109998)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should find no withdrawals at 2 vaults',
    async () => {
      const findings = await runBlock(20116800, 20116799)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
