import { ERC20Short__factory, L2Bridge__factory } from '../generated/typechain'
import { Address } from '../utils/constants'
import { ethers } from 'forta-agent'
import { Config } from '../utils/env/env'
import promClient from 'prom-client'
import { Metrics } from '../utils/metrics/metrics'
import { MonitorWithdrawals } from './monitor_withdrawals'
import { TransactionDto } from '../entity/events'
import { OptimismClient } from '../clients/optimism_client'
import * as Winston from 'winston'
import BigNumber from 'bignumber.js'
import { WithdrawalRecord } from '../entity/blockDto'

const TEST_TIMEOUT = 120_000

describe('monitor_withdrawals', () => {
  const config = new Config()
  const adr: Address = Address

  const logger: Winston.Logger = Winston.createLogger({
    format: config.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  const optimismProvider = new ethers.providers.JsonRpcProvider(config.optimismRpcUrl, config.chainId)

  const l2Bridge = L2Bridge__factory.connect(adr.OPTIMISM_L2_TOKEN_GATEWAY.address, optimismProvider)
  const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.OPTIMISM_WSTETH_BRIDGED.address, optimismProvider)
  const bridgedLdoRunner = ERC20Short__factory.connect(adr.OPTIMISM_LDO_BRIDGED_ADDRESS, optimismProvider)

  const customRegister = new promClient.Registry()
  const metrics = new Metrics(customRegister, config.promPrefix)
  const l2Client = new OptimismClient(optimismProvider, metrics, l2Bridge, bridgedWSthEthRunner, bridgedLdoRunner)

  const l2BlockNumber = 121_867_825
  const withdrawalsSrv = new MonitorWithdrawals(l2Client, adr.OPTIMISM_L2_TOKEN_GATEWAY.address, logger)

  test(
    'handleTransaction is 2.008529093774247442',
    async () => {
      const trx = await optimismProvider.getTransaction(
        '0x3c122943576f8b1577782edc98a5634830e3131d3dfdc6d36c16e2411b3c2d7a',
      )

      const logs = await optimismProvider.getLogs({
        blockHash: '0x8104eec958e7be1b0ff637d9392ffc680ecc89c831d97a06df8fcec58e6fc62f',
      })

      const trxDto: TransactionDto = {
        logs: logs,
        to: trx.to ? trx.to.toLowerCase() : null,
        block: {
          number: new BigNumber(trx.blockNumber ? trx.blockNumber : l2BlockNumber, 10).toNumber(),
          timestamp: new BigNumber(trx.timestamp ? trx.timestamp : 1719323627, 10).toNumber(),
        },
      }

      const withdrawalRecord = withdrawalsSrv.handleTransaction(trxDto)
      if (withdrawalRecord === null) {
        throw new Error('Could not parse log')
      }

      const expectedAmount = new BigNumber('2008529093774247442')

      const expected: WithdrawalRecord = {
        timestamp: 1719323627,
        amount: expectedAmount,
      }

      expect(withdrawalRecord).toEqual(expected)
    },
    TEST_TIMEOUT,
  )
})
