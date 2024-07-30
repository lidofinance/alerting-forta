import { Address, DeploymentAddresses } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from '../../generated/typechain'
import { getOssifiedProxyEvents } from '../../utils/events/ossified_proxy_events'
import { getPausableEvents } from '../../utils/events/pausable_events'
import { getBurnerEvents } from '../../utils/events/burner_events'
import { ProxyWatcherSrv, IProxyWatcherClient } from './ProxyWatcher.srv'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from 'forta-agent'
import { Finding } from '../../generated/proto/alert_pb'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import { EtherscanProviderMock } from '../../clients/mocks/mock'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'

const TEST_TIMEOUT = 120_000 // ms

describe('CsFeeOracle event tests', () => {
  const chainId = 17000

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const address: Address = DeploymentAddresses

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

  const proxyWatcherClient: IProxyWatcherClient = new ETHProvider(
    logger,
    m,
    fortaEthersProvider,
    EtherscanProviderMock(),
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const proxyWatcherSrv = new ProxyWatcherSrv(
    logger,
    proxyWatcherClient,
    getOssifiedProxyEvents(),
    getPausableEvents(),
    getBurnerEvents(),
  )

  test(
    '🟣 Admin Changed',
    async () => {
      const txHash = '0x92410350f567757d8f73b2f4b3670454af3899d095103ea0e745c92714673277'

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

      const results = proxyWatcherSrv.handleTransaction(transactionDto)

      const expected = {
        alertId: 'PROXY-ADMIN-CHANGED',
        description:
          'The proxy admin for CSModule(0x4562c3e63c2e586cD1651B958C22F88135aCAd4f) has been changed from [0xc4DAB3a3ef68C6DFd8614a870D64D475bA44F164](https://etherscan.io/address/0xc4DAB3a3ef68C6DFd8614a870D64D475bA44F164) to [0xE92329EC7ddB11D25e25b3c21eeBf11f15eB325d](https://etherscan.io/address/0xE92329EC7ddB11D25e25b3c21eeBf11f15eB325d)',
        name: '🟣 CSModule: Admin Changed',
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      }

      expect(results[0].getAlertid()).toEqual(expected.alertId)
      expect(results[0].getDescription()).toEqual(expected.description)
      expect(results[0].getName()).toEqual(expected.name)
      expect(results[0].getSeverity()).toEqual(expected.severity)
      expect(results[0].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )

  test(
    '🟣 Implementation Upgraded',
    async () => {
      const txHash = '0x262faac95560f7fc0c831580d17e48daa69b17831b798e0b00bc43168a310c52'

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

      const results = proxyWatcherSrv.handleTransaction(transactionDto)

      const expected = {
        alertId: 'PROXY-UPGRADED',
        description: 'The proxy implementation has been upgraded to 0x4d70efa74ec0ac3a5f759cc0f714c94cbc5cc4da',
        name: '🟣 CSModule: Implementation Upgraded',
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.INFORMATION,
      }

      expect(results[0].getAlertid()).toEqual(expected.alertId)
      expect(results[0].getDescription()).toEqual(expected.description)
      expect(results[0].getName()).toEqual(expected.name)
      expect(results[0].getSeverity()).toEqual(expected.severity)
      expect(results[0].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )
})
