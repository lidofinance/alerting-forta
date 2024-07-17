import { TransactionDto } from '../../entity/events'
import * as Winston from 'winston'
import { ethers, Finding } from 'forta-agent'

import { MultisigWatcherSrv } from './MultisigWatcher.srv'

const TEST_TIMEOUT = 120_000 // ms

describe('MultisigWatcher srv functional tests', () => {
  const drpcURL = `https://eth.drpc.org`
  const mainnet = 1
  const ethProvider = new ethers.providers.JsonRpcProvider(drpcURL, mainnet)

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const service = new MultisigWatcherSrv(logger)

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
        transaction: {
          data: trx.data || '',
          hash: trx.hash || '',
        },
      }

      return service.handleTransaction(transactionDto)
    }
  })

  afterAll(() => {
    jest.resetAllMocks()
  })

  it(
    'should process tx with Added Owner and Execution Success',
    async () => {
      const findings = await runTransaction('0x4c3e507fd78daac24dd75e33e7c69381481db8bce62c795d2eec67126ad6d396')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
  it(
    'should process tx with Changed Threshold and Execution Success',
    async () => {
      const findings = await runTransaction('0xb58e9e81ad1dac1f33b9dfc4d19f2d909a2a3ea890c31aa27a0df10f86bd4eea')
      expect(findings).toMatchSnapshot()
    },
    TEST_TIMEOUT,
  )
})
