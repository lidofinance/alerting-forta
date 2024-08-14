import * as Winston from 'winston'
import { ethers, Finding } from 'forta-agent'

import { EventWatcherSrv } from './EventWatcher.srv'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import { getCrossChainExecutorEvents } from '../../utils/events/cross_chain_executor_events'
import { CROSS_CHAIN_EXECUTOR_ADDRESS } from '../../utils/constants'
import { TransactionDto } from '../../utils/types'
import { TransactionEvent } from 'forta-agent/dist/sdk/transaction.event'

const TEST_TIMEOUT = 120_000 // ms

describe('EventWatcher srv functional tests', () => {
  const chainId = 56
  const ethProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, chainId)

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const service = new EventWatcherSrv(
    'CrossChainExecutorWatcher',
    getCrossChainExecutorEvents(CROSS_CHAIN_EXECUTOR_ADDRESS),
    logger,
  )

  let runTransaction: (txHash: string, initBlock?: number) => Promise<Finding[]>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-01').getTime())

    runTransaction = async (txHash: string) => {
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

      return service.handleTransaction(transactionDto as TransactionEvent)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should find nothing',
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
