import {
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
import { CSFeeOracleSrv, ICSFeeOracleClient } from './CSFeeOracle.srv'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from 'forta-agent'
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

  const csFeeOracleClient: ICSFeeOracleClient = new ETHProvider(
    logger,
    m,
    fortaEthersProvider,
    EtherscanProviderMock(),
    csModuleRunner,
    csAccountingRunner,
    csFeeDistributorRunner,
    csFeeOracleRunner,
  )

  const csFeeOracleSrv = new CSFeeOracleSrv(
    logger,
    csFeeOracleClient,
    getOssifiedProxyEvents(CSM_PROXY_CONTRACTS),
    getPausableEvents(PAUSABLE_CONTRACTS),
    address.HASH_CONSENSUS_ADDRESS,
    address.CS_FEE_ORACLE_ADDRESS,
  )

  test(
    '🔵 2 events: ProcessingStarted(), ReportSettled()',
    async () => {
      const txHash = '0xf53cfcc9e576393b481a1c8ff4d28235703b6b5b62f9edb623d913b5d059f9c5'
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

      const results = csFeeOracleSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(2)
    },
    TEST_TIMEOUT,
  )

  test(
    '🔴 4 events: ConsensusHashContractSet(), ConsensusVersionSet(), FeeDistributorContractSet(), PerfLeewaySet()',
    async () => {
      const txHash = '0xdc5ed949e5b30a5ff6f325cd718ba5a52a32dc7719d3fe7aaf9661cc3da7e9a6'
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

      const results = csFeeOracleSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(4)
    },
    TEST_TIMEOUT,
  )

  test(
    '🔴 HashConsensus: Member added',
    async () => {
      const txHash = '0x17caac93fd9bb42d12755743eb999dd50eff92a5e49aadbf83061861cdfbf997'

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

      const results = csFeeOracleSrv.handleTransaction(transactionDto)

      expect(results).toMatchSnapshot()
      expect(results.length).toBe(1)
    },
    TEST_TIMEOUT,
  )
})
