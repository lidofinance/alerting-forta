import { DeploymentAddress, DeploymentAddresses } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from '../../generated/typechain'
import { CSModuleSrv, ICSModuleClient } from './CSModule.srv'
import { getCSModuleEvents } from '../../utils/events/cs_module_events'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from '@fortanetwork/forta-bot'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'

const TEST_TIMEOUT = 120_000 // ms

describe('CSModule event tests', () => {
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

  const csModuleClient: ICSModuleClient = new ETHProvider(
    logger,
    m,
    fortaEthersProvider,
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const csModuleSrv = new CSModuleSrv(
    logger,
    csModuleClient,
    address.CS_MODULE_ADDRESS,
    address.STAKING_ROUTER_ADDRESS,
    getCSModuleEvents(address.CS_MODULE_ADDRESS),
  )

  test(
    '🟠 CSModule: Target limit mode changed',
    async () => {
      const txHash = '0xd8bb4389a056be70fe20e3b6b903c3e7cdbf053610bd8d647c4e2fe49c94f8b6'

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

      const results = await csModuleSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )

  test(
    '🔴 CSModule: EL Rewards stealing penalty reported',
    async () => {
      const txHash = '0x45d08822a9e025d374ab182612a119d837a0869b0c343379025303f53c4c63be'

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

      const results = await csModuleSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )

  test(
    '🔵 CSModule: Notable Node Operator creation',
    async () => {
      const txHash = '0x87ece6668905293fd00c7eeff15ff685ed1d10810bc5cbba204f0881ab877be6'

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

      const results = await csModuleSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )
})
