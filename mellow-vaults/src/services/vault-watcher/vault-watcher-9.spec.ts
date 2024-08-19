import { BlockDto } from '../../entity/events'
import * as Winston from 'winston'
import { ethers, Finding } from 'forta-agent'

import { VaultWatcherSrv } from './VaultWatcher.srv'
import { App } from '../../app'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'

const TEST_TIMEOUT = 120_000 // ms

describe('VaultWatchers srv functional tests', () => {
  const mainnet = 1
  const ethProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, mainnet)

  const ethClient = App.prepareClient(ethProvider)

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const service = new VaultWatcherSrv(logger, ethClient)

  let runBlock: (blockHashOrNumber: string | number, initBlock: number) => Promise<Finding[]>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-01').getTime())

    runBlock = async (blockHashOrNumber, initBlock) => {
      if (initBlock > Number(blockHashOrNumber)) {
        throw new Error('Wrong initial block or argument order')
      }
      const initErr = await service.initialize(initBlock)
      if (initErr instanceof Error) {
        throw initErr
      }
      const block = await ethProvider.getBlock(blockHashOrNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      return service.handleBlock(blockDto)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should find limits integrity medium',
    async () => {
      const findings = await runBlock(20527718, 20527717)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
