import { ethers, Finding, getEthersProvider, Network, Transaction } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'
import { createTransactionEvent, etherBlockToFortaBlockEvent } from './utils'
import { App } from '../../src/app'

const TEST_TIMEOUT = 160_000 // ms

describe('agent-aragon-voting e2e tests', () => {
  let ethProvider: JsonRpcProvider

  let logSpy: jest.SpyInstance
  let timeSpy: jest.SpyInstance

  let runTransaction: (txHash: string) => Promise<Finding[]>
  let runBlock: (blockHashOrNumber: string | number, initBlock: number) => Promise<Finding[]>

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log')
    logSpy.mockImplementation(() => {})
    timeSpy = jest.spyOn(Date, 'now')
    timeSpy.mockImplementation(() => new Date('2023-12-31'))

    ethProvider = getEthersProvider()

    runTransaction = async (txHash: string) => {
      const app = await App.getInstance()

      const receipt = await ethProvider.send('eth_getTransactionReceipt', [txHash])
      const block = await ethProvider.send('eth_getBlockByNumber', [
        ethers.utils.hexValue(parseInt(receipt.blockNumber)),
        true,
      ])
      const transaction = block.transactions.find((tx: Transaction) => tx.hash.toLowerCase() === txHash)!

      const txEvent = createTransactionEvent(transaction, block, Network.MAINNET, [], receipt.logs)

      return app.AragonVotingSrv.handleTransaction(txEvent)
    }

    runBlock = async (blockHashOrNumber, initBlock) => {
      const app = await App.getInstance()

      const blockNumber = initBlock
      const block = await ethProvider.getBlock(blockHashOrNumber)

      await app.AragonVotingSrv.initialize(blockNumber, false)
      const blockEvent = etherBlockToFortaBlockEvent(block)
      return app.AragonVotingSrv.handleBlock(blockEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should process tx with started vote',
    async () => {
      const findings = await runTransaction('0x69987bf8c4352c40e0429c8492d4842011071524171cd382ea7327d808b37858')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with executed vote',
    async () => {
      const findings = await runTransaction('0x4cc1911b3016ceec169db5b73714b02ee155fb03b6e018fc66a1063a9c1e15fa')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process block with changed outcome',
    async () => {
      const findings = await runBlock(16691599, 16691598)
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
