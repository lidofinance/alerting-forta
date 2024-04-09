import { ethers, Finding, getEthersProvider, Network, Transaction } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'

import { App } from '../../src/app'
import { createTransactionEvent } from './utils'

const TEST_TIMEOUT = 60_000 // ms

describe('agent-trp-changes e2e tests', () => {
  let ethProvider: JsonRpcProvider
  let runTransaction: (txHash: string) => Promise<Finding[]>
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

      return app.TrpChangesSrv.handleTransaction(txEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should return empty array',
    async () => {
      const findings = await runTransaction('0xd09be189f24903c8dc58676c22bd6b9ffc39bbb3f9f5c5a8613e3d198e310159')
      expect(findings.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )
})
