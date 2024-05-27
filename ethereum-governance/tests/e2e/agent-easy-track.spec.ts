import { ethers, Finding, getEthersProvider, Network, Transaction } from 'forta-agent'
import { createTransactionEvent } from './utils'
import { JsonRpcProvider } from '@ethersproject/providers'
import { App } from '../../src/app'

const TEST_TIMEOUT = 60_000 // ms

describe('agent-easy-track e2e tests', () => {
  let ethProvider: JsonRpcProvider

  let logSpy: jest.SpyInstance
  let timeSpy: jest.SpyInstance
  let runTransaction: (txHash: string) => Promise<Finding[]>

  beforeAll(async () => {
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

      return app.EasyTrackSrv.handleTransaction(txEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should process tx with new motion created',
    async () => {
      const findings = await runTransaction('0x6cead5592d65a47dcc099490db2e38b742860a47b04eb83718ca59a7bb1eb28c')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with granted role',
    async () => {
      const findings = await runTransaction('0x55c4c7e33eb92da16871944879d52180c1a2e59c2701404abef864c5196ab7f1')

      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with revoked role',
    async () => {
      const findings = await runTransaction('0x043e04411dd746562fd9c4244ac30570f09a737d73e9523edbdce722de3a2093')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with executed motion',
    async () => {
      const findings = await runTransaction('0x4f0b1a48a364bed1699979b581908f1f96396fc42b16fad066fa68d002a49580')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with objected motion',
    async () => {
      const findings = await runTransaction('0x3026189f7287678ca31403f77939ae812c9706eaca73d7966b405acebd56b2c4')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with granted role on RewardProgramsRegistry',
    async () => {
      const findings = await runTransaction('0xd02f92e5a47792082f41ad6ca9e2d05d60f409a63328ac41a5d2704a7eb3fc1c')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
