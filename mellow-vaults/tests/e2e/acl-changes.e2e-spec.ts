import { Finding, getEthersProvider } from 'forta-agent'
import { JsonRpcProvider } from '@ethersproject/providers'

import { App } from '../../src/app'
import { etherBlockToFortaBlockEvent } from './utils'

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

    runBlock = async (blockHashOrNumber, initBlock) => {
      const app = await App.getInstance()

      const blockNumber = initBlock
      const block = await ethProvider.getBlock(blockHashOrNumber)
      if (blockNumber) {
        await app.AclChangesSrv.initialize(blockNumber)
      }
      const blockEvent = etherBlockToFortaBlockEvent(block)
      return app.AclChangesSrv.handleBlock(blockEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should everything is fine',
    async () => {
      const findings = await runBlock(20061165, 20061166)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
