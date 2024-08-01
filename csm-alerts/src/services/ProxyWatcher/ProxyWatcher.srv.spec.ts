import {
  CONTRACTS_WITH_ASSET_RECOVERER,
  CSM_PROXY_CONTRACTS,
  DeploymentAddress,
  DeploymentAddresses,
  PAUSABLE_CONTRACTS,
} from '../../utils/constants.holesky'
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
import { getAssetRecovererEvents } from '../../utils/events/asset_recoverer_events'
import { ProxyWatcherSrv, IProxyWatcherClient } from './ProxyWatcher.srv'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from 'forta-agent'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import { EtherscanProviderMock } from '../../clients/mocks/mock'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'

const TEST_TIMEOUT = 120_000 // ms

describe('ProxyWatcher event tests', () => {
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
    getOssifiedProxyEvents(CSM_PROXY_CONTRACTS),
    getPausableEvents(PAUSABLE_CONTRACTS),
    getAssetRecovererEvents(CONTRACTS_WITH_ASSET_RECOVERER),
  )

  test(
    '🚨 Admin Changed',
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

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(4)
    },
    TEST_TIMEOUT,
  )

  test(
    '🚨 Implementation Upgraded',
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

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(4)
    },
    TEST_TIMEOUT,
  )
})
