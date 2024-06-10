import { ethers, Finding, getEthersProvider, Network, Transaction } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'

import { App } from '../../src/app'
import { createTransactionEvent, etherBlockToFortaBlockEvent } from './utils'

const TEST_TIMEOUT = 60_000 // ms

describe('vault-acl-changes e2e tests', () => {
  let ethProvider: JsonRpcProvider
  // let getRoleMembers: (address: string, hash: string, currentBlock: BlockTag) => Promise<E.Either<Error, string[]>>
  let runTransaction: (txHash: string) => Promise<Finding[]>
  let runBlock: (blockHashOrNumber: string | number, initBlock: number) => Promise<Finding[]>
  let logSpy: jest.SpyInstance
  let timeSpy: jest.SpyInstance

  beforeAll(() => {
    ethProvider = getEthersProvider()

    logSpy = jest.spyOn(console, 'log')
    logSpy.mockImplementation(() => {})
    timeSpy = jest.spyOn(Date, 'now')
    timeSpy.mockImplementation(() => new Date('2023-12-31'))

    runTransaction = async (txHash: string) => {
      const app = await App.getInstance()

      const receipt = await ethProvider.send('eth_getTransactionReceipt', [txHash])
      const block = await ethProvider.send('eth_getBlockByNumber', [
        ethers.utils.hexValue(parseInt(receipt.blockNumber)),
        true,
      ])
      const transaction = block.transactions.find((tx: Transaction) => tx.hash.toLowerCase() === txHash)!

      const txEvent = createTransactionEvent(transaction, block, Network.MAINNET, [], receipt.logs)

      return app.VaultWatcherSrv.handleTransaction(txEvent)
    }

    runBlock = async (blockHashOrNumber, initBlock) => {
      const app = await App.getInstance()

      const blockNumber = initBlock
      const block = await ethProvider.getBlock(blockHashOrNumber)

      await app.VaultWatcherSrv.initialize(blockNumber)
      const blockEvent = etherBlockToFortaBlockEvent(block)
      return app.VaultWatcherSrv.handleBlock(blockEvent)
    }
    // getRoleMembers = async (address: string, hash: string, currentBlock: BlockTag) => {
    //   const app = await App.getInstance()
    //   return app.ethClient.getRoleMembers(address, hash, currentBlock)
    // }
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
    'should detect slot change',
    async () => {
      const findings = await runTransaction('0xffef3e8046d882ccd5773582438ebf6576e4093dec734ed27e0f5065d1a89d7b')
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
})
