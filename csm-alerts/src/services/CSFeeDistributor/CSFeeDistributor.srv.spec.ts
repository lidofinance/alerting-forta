import { Address, AddressHol } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from '../../generated/typechain'
import { getCSFeeDistributorEvents } from '../../utils/events/cs_fee_distributor_events'
import { getOssifiedProxyEvents } from '../../utils/events/ossified_proxy_events'
import { getBurnerEvents } from '../../utils/events/burner_events'
import { CSFeeDistributorSrv, ICSFeeDistributorClient } from './CSFeeDistributor.srv'
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

describe('CsFeeDistributor event tests', () => {
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
    getOssifiedProxyEvents(),
    getBurnerEvents(address.BURNER_ADDRESS),
    getCSFeeDistributorEvents(address.CS_FEE_DISTRIBUTOR_ADDRESS, address.CS_ACCOUNTING_ADDRESS),
  )

  test(
    '🟣 Admin Changed',
    async () => {
      const txHash = '0x389e2926ea5aeb793bc30f4b0e6507599549c35a03482971428b71337dd53e2d'

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

      const expected = {
        alertId: 'PROXY-ADMIN-CHANGED',
        description:
          'The proxy admin for CSFeeDistributor(0xD7ba648C8F72669C6aE649648B516ec03D07c8ED) has been changed from [0xc4DAB3a3ef68C6DFd8614a870D64D475bA44F164](https://etherscan.io/address/0xc4DAB3a3ef68C6DFd8614a870D64D475bA44F164) to [0xE92329EC7ddB11D25e25b3c21eeBf11f15eB325d](https://etherscan.io/address/0xE92329EC7ddB11D25e25b3c21eeBf11f15eB325d)',
        name: '🟣 CSFeeDistributor: Admin Changed',
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      }

      expect(results[2].getAlertid()).toEqual(expected.alertId)
      expect(results[2].getDescription()).toEqual(expected.description)
      expect(results[2].getName()).toEqual(expected.name)
      expect(results[2].getSeverity()).toEqual(expected.severity)
      expect(results[2].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )
})
