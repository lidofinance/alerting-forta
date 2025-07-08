import { BlockDto } from '../../entity/events'
import * as Winston from 'winston'
import { ethers, Finding } from 'forta-agent'

import { AclChangesSrv } from './AclChanges.srv'
import { App } from '../../app'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'

const TEST_TIMEOUT = 120_000 // ms

describe('AclChanges srv functional tests', () => {
  const mainnet = 1
  const ethProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, mainnet)

  const ethClient = App.prepareClient(ethProvider)

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const service = new AclChangesSrv(logger, ethClient)

  let runBlock: (blockHashOrNumber: string | number, initBlock: number) => Promise<Finding[]>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-01').getTime())

    runBlock = async (blockHashOrNumber, initBlock) => {
      if (initBlock > Number(blockHashOrNumber)) {
        throw new Error('Wrong initial block or argument order')
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
    'should everything is fine',
    async () => {
      const findings = await runBlock(20061165, 20061164)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
