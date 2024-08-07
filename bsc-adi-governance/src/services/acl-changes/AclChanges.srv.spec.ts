import * as Winston from 'winston'
import { BlockEvent, Finding, getEthersProvider } from 'forta-agent'

import { AclChangesSrv } from './AclChanges.srv'
import { CrossChainController__factory } from '../../generated'
import { CROSS_CHAIN_CONTROLLER_ADDRESS } from '../../utils/constants'
import { BSCProvider } from '../../clients/bsc_provider'

const TEST_TIMEOUT = 120_000 // ms

describe('AclChanges srv functional tests', () => {
  const ethersProvider = getEthersProvider()

  const crossChainControllerRunner = CrossChainController__factory.connect(
    CROSS_CHAIN_CONTROLLER_ADDRESS,
    ethersProvider,
  )

  const bscClient = new BSCProvider(ethersProvider, crossChainControllerRunner)

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const service = new AclChangesSrv(logger, bscClient)

  let runBlock: (blockNumber: number, initBlock: number) => Promise<Finding[]>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-01').getTime())

    runBlock = async (blockNumber, initBlock) => {
      if (initBlock > Number(blockNumber)) {
        throw new Error('Wrong initial block or argument order')
      }
      await service.initialize(initBlock)
      const BlockEventHack = { blockNumber } as BlockEvent
      return service.handleBlock(BlockEventHack)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should find owner not in whitelist',
    async () => {
      const findings = await runBlock(39776807, 39776806)
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
