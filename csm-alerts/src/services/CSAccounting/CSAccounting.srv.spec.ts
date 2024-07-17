import { Address, AddressHol } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from '../../generated/typechain'
import { getCSAccountingEvents } from '../../utils/events/cs_accounting_events'
import { getOssifiedProxyEvents } from '../../utils/events/ossified_proxy_events'
import { getPausableEvents } from '../../utils/events/pausable_events'
import { getBurnerEvents } from '../../utils/events/burner_events'
import { CSAccountingSrv, ICSAccountingClient } from './CSAccounting.srv'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from 'forta-agent'
import { Finding } from '../../generated/proto/alert_pb'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import { EtherscanProviderMock } from '../../clients/mocks/mock'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'
// import { etherscanAddress } from '../../utils/string'

const TEST_TIMEOUT = 120_000 // ms

describe('CsAccounting event tests', () => {
  const chainId = 17000

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const address: AddressHol = Address

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
    EtherscanProviderMock(),
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const csAccountingSrv = new CSAccountingSrv(
    logger,
    csAccountingClient,
    getOssifiedProxyEvents(),
    getPausableEvents(),
    getBurnerEvents(address.BURNER_ADDRESS),
    getCSAccountingEvents(address.CS_ACCOUNTING_ADDRESS),
  )

  test(
    '🔴 Bond curve added',
    async () => {
      const txHash = '0x58aa619917da4128967d7264bef4117660a52bbdfb6cb353a2a769d8b45b6d8f'

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

      const results = csAccountingSrv.handleTransaction(transactionDto)

      const expected = {
        alertId: 'CS-ACCOUNTING-BOND-CURVE-ADDED',
        description:
          'Bond curve added: 1500000000000000000,3400000000000000000,5200000000000000000,6900000000000000000,8500000000000000000,10000000000000000000',
        name: '🔴 CSAccounting: Bond curve added',
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.INFORMATION,
      }

      expect(results.length).toEqual(1)

      expect(results[0].getAlertid()).toEqual(expected.alertId)
      expect(results[0].getDescription()).toEqual(expected.description)
      expect(results[0].getName()).toEqual(expected.name)
      expect(results[0].getSeverity()).toEqual(expected.severity)
      expect(results[0].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )
})
