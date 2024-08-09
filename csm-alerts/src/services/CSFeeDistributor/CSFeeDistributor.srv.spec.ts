import { DeploymentAddress, DeploymentAddresses } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from '../../generated/typechain'
import { getCSFeeDistributorEvents } from '../../utils/events/cs_fee_distributor_events'
import { CSFeeDistributorSrv, ICSFeeDistributorClient } from './CSFeeDistributor.srv'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from 'forta-agent'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import { EtherscanProviderMock } from '../../clients/mocks/mock'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'

const TEST_TIMEOUT = 120_000 // ms

describe('CsFeeDistributor event tests', () => {
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

  const csFeeDistributorClient: ICSFeeDistributorClient = new ETHProvider(
    logger,
    m,
    fortaEthersProvider,
    EtherscanProviderMock(),
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const csFeeDistributorSrv = new CSFeeDistributorSrv(
    logger,
    csFeeDistributorClient,
    getCSFeeDistributorEvents(address.CS_FEE_DISTRIBUTOR_ADDRESS),
    address.CS_ACCOUNTING_ADDRESS,
    address.CS_FEE_DISTRIBUTOR_ADDRESS,
    address.LIDO_STETH_ADDRESS,
  )

  test(
    '🔵 INFO: DistributionDataUpdated',
    async () => {
      const txHash = '0x33a9fb726d09d543c417cb0985a41a7bee39e81e8536b5969784a520f4d2e0c1'

      const trx = await fortaEthersProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
      }

      const results = csFeeDistributorSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )
})
