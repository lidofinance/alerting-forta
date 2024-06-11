import { ethers, Finding, getEthersProvider, Network, Transaction } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'

import { App } from '../../src/app'
import { createTransactionEvent } from './utils'

const TEST_TIMEOUT = 60_000 // ms

describe('vault-acl-changes e2e tests', () => {
  let ethProvider: JsonRpcProvider
  let runTransaction: (txHash: string, initBlock?: number) => Promise<Finding[]>
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
        await app.MultisigWatcherSrv.initialize(initBlock)
      }

      const txEvent = createTransactionEvent(transaction, block, Network.MAINNET, [], receipt.logs)

      return app.MultisigWatcherSrv.handleTransaction(txEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

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
})
