import { DeploymentAddress, DeploymentAddresses } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from '../../generated/typechain'
import { getCSAccountingEvents } from '../../utils/events/cs_accounting_events'
import { CSAccountingSrv, ICSAccountingClient } from './CSAccounting.srv'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from 'forta-agent'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'

const TEST_TIMEOUT = 120_000 // ms

describe('CSAccounting event tests', () => {
  const chainId = 17000

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const address: DeploymentAddress = DeploymentAddresses

  const fortaEthersProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, chainId)
  const csModuleRunner = CSModule__factory.connect(address.CS_MODULE_ADDRESS, fortaEthersProvider)
  const csAccountingRunner = CSAccounting__factory.connect(address.CS_ACCOUNTING_ADDRESS, fortaEthersProvider)
  const csFeeDistributorRunner = CSFeeDistributor__factory.connect(
    address.CS_FEE_DISTRIBUTOR_ADDRESS,
    fortaEthersProvider,
  )
  const csFeeOracleRunner = CSFeeOracle__factory.connect(address.CS_FEE_ORACLE_ADDRESS, fortaEthersProvider)

  const registry = new promClient.Registry()
  const m = new Metrics(registry, 'test_')

  const csAccountingClient: ICSAccountingClient = new ETHProvider(
    logger,
    m,
    fortaEthersProvider,
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const csAccountingSrv = new CSAccountingSrv(
    logger,
    csAccountingClient,
    getCSAccountingEvents(address.CS_ACCOUNTING_ADDRESS),
    address.CS_ACCOUNTING_ADDRESS,
    address.LIDO_STETH_ADDRESS,
    address.CS_MODULE_ADDRESS,
  )

  test(
    '🚨 CSAccounting: Bond Curve Updated',
    async () => {
      const txHash = '0x8b904da83d58e520c778cc562b10fa4e0943a9f991b9050d93481fdabf2da9c2'

      const trx = await fortaEthersProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
        hash: trx.hash,
      }

      const results = await csAccountingSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )

  test(
    '🔴 CSAccounting: Bond Curve added, stETH Approval',
    async () => {
      const txHash = '0xcc92653babec3b1748d8e04de777796cab2d1ae40fbe926db857e9103a9b74a5'

      const trx = await fortaEthersProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
        hash: trx.hash,
      }

      const results = await csAccountingSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(4)
    },
    TEST_TIMEOUT,
  )

  test(
    '🚨 CSAccounting: Charge Penalty Recipient Set',
    async () => {
      const txHash = '0xf62269919009e1cb9c6ea8c29cb6c83f9c1d113d97d401ed5ff2b696cee6d82f'

      const trx = await fortaEthersProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
        hash: trx.hash,
      }

      const results = await csAccountingSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )

  test(
    '🔴 CSAccounting: Bond Curve Set',
    async () => {
      const txHash = '0xcea4d214c8f6e4f3415fc941fdb6802f4243a7b3e12ba5288cf7e7df39d457a0'

      const trx = await fortaEthersProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
        hash: trx.hash,
      }

      const results = await csAccountingSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )
})
