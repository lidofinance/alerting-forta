import { TransactionDto } from '../../utils/types'
import * as Winston from 'winston'
import { ethers, Finding, getEthersProvider } from 'forta-agent'

import { CrossChainControllerSrv } from './CrossChainController.srv'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'
import { BSCProvider } from '../../clients/bsc_provider'
import { CrossChainController__factory } from '../../generated'
import { CROSS_CHAIN_CONTROLLER_ADDRESS } from '../../utils/constants'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'

const TEST_TIMEOUT = 120_000 // ms

describe('CrossChainController Srv functional tests', () => {
  const chainId = 56
  const ethProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, chainId)

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

  const service = new CrossChainControllerSrv(logger, bscClient, CROSS_CHAIN_CONTROLLER_ADDRESS)

  let runTransaction: (txHash: string, initBlock: number) => Promise<Finding[]>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-01').getTime())

    runTransaction = async (txHash: string, initBlock: number) => {
      const trx = await ethProvider.getTransaction(txHash)
      const receipt = await trx.wait()
      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
      }
      await service.initialize(initBlock)
      return service.handleTransaction(transactionDto as TransactionEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should find ConfirmationsUpdated',
    async () => {
      const findings = await runTransaction(
        '0x1042618d67813e40d9cae2d4e4f72924963c72455140ca921ab29eaff5aaed55',
        39776560,
      )
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should find TransactionReceived',
    async () => {
      const findings = await runTransaction(
        '0x81b925698152319f40e667c12d0da2370562f4f0d9f9c166ce7bcddbc5f0dcb3',
        39920557,
      )
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should find 4 ReceiverBridgeAdaptersUpdated',
    async () => {
      const findings = await runTransaction(
        '0x86a1f2ae752fec82b647b6dfecedcf702ba83161b92b2dd9228e3a3dde3f2462',
        39776551,
      )
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )

  it(
    'should find GuardianUpdated',
    async () => {
      const findings = await runTransaction(
        '0xda1572eb6360116ea0fbd9f898b1413823ba2ab4bb1cbb5e150cce42c68a687c',
        39775722,
      )
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
