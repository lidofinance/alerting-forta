import { ethers, Finding, getEthersProvider, Network, Transaction } from 'forta-agent'
import { BlockTag, JsonRpcProvider } from '@ethersproject/providers'

import { roleByName } from '../../src/utils/string'
import { App } from '../../src/app'
import { createTransactionEvent } from './utils'
import * as E from 'fp-ts/Either'

const TEST_TIMEOUT = 60_000 // ms

describe('agent-acl-changes e2e tests', () => {
  let ethProvider: JsonRpcProvider
  let getRoleMembers: (address: string, hash: string, currentBlock: BlockTag) => Promise<E.Either<Error, string[]>>
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

      return app.EasyTrackSrv.handleTransaction(txEvent)
    }

    getRoleMembers = async (address: string, hash: string, currentBlock: BlockTag) => {
      const app = await App.getInstance()
      return app.ethClient.getRoleMembers(address, hash, currentBlock)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should process tx with permission change',
    async () => {
      const findings = await runTransaction('0x46d937a9bb533feaf3b7936d230822eecc65d7ff4f6e38a4e17d3ca59cdf0799')
      expect(findings.at(0)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should process tx with permission manager changed',
    async () => {
      const findings = await runTransaction('0x11a48020ae69cf08bd063f1fbc8ecf65bd057015aaa991bf507dbc598aadb68e')
      expect(findings.at(2)).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    "should get role's members of a contract",
    async () => {
      const admins = await getRoleMembers(
        '0xbf05A929c3D7885a6aeAd833a992dA6E5ac23b09', // OracleDaemonConfig
        roleByName('DEFAULT_ADMIN_ROLE').hash,
        'latest',
      )
      if (E.isLeft(admins)) {
        throw new Error(E.left.name)
      }
      expect(admins.right).toEqual([
        '0x3e40d73eb977dc6a537af587d48316fee66e9c8c', // Aragon Agent
      ])

      const members = await getRoleMembers(
        '0xD15a672319Cf0352560eE76d9e89eAB0889046D3', // Burner
        roleByName('REQUEST_BURN_SHARES_ROLE').hash,
        'latest',
      )
      if (E.isLeft(members)) {
        throw new Error(E.left.name)
      }
      expect(
        members.right.includes('0xae7ab96520de3a18e5e111b5eaab095312d7fe84'), // Lido
      ).toBeTruthy()
    },
    TEST_TIMEOUT,
  )
})
