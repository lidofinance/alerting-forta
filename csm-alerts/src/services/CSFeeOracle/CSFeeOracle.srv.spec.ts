import { Address, DeploymentAddresses } from '../../utils/constants.holesky'
import { expect } from '@jest/globals'
import { TransactionDto } from '../../entity/events'
import {
  CSModule__factory,
  CSAccounting__factory,
  CSFeeDistributor__factory,
  CSFeeOracle__factory,
} from '../../generated/typechain'
import { getCSFeeOracleEvents, getHashConsensusEvents } from '../../utils/events/cs_fee_oracle_events'
import { getOssifiedProxyEvents } from '../../utils/events/ossified_proxy_events'
import { getPausableEvents } from '../../utils/events/pausable_events'
import { getBurnerEvents } from '../../utils/events/burner_events'
import { CSFeeOracleSrv, ICSFeeOracleClient } from './CSFeeOracle.srv'
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
    getOssifiedProxyEvents(),
    getPausableEvents(),
    getBurnerEvents(address.BURNER_ADDRESS),
    getHashConsensusEvents(address.HASH_CONSENSUS_ADDRESS),
    getCSFeeOracleEvents(address.CS_FEE_ORACLE_ADDRESS),
  )

  test(
    '🟣 Implementation Upgraded',
    async () => {
      const txHash = '0x262faac95560f7fc0c831580d17e48daa69b17831b798e0b00bc43168a310c52'
      // const txHash = '0x394b2455d73926e7b8601fd367841fd1563bc68d4b42a3bead8e2f5673c89a7c'

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

      const expected = [
        {
          alertId: 'CSFEE-ORACLE-PROCESSING-STARTED',
          description:
            'Processing started for slot 2068159. Hash: 0x3f42b4c85f55a07ab3f38c6c910871fd654fe9dfed64c9ff69e8ad4921fd487b',
          name: '🔵 CSFeeOracle: Processing started',
          severity: Finding.Severity.INFO,
          type: Finding.FindingType.INFORMATION,
        },
        {
          alertId: 'CSFEE-ORACLE-REPORT-SETTLED',
          description:
            'Report settled for slot 2068159. Distributed: 219882093527933929, Tree root: 0xfe5c8e3e617728bb0cd034313cc615f79ff7e93ff2e747b99d39b7e36a65b56a, Tree CID: QmV9AfsMa4zV3J1AjMhNuTQP4F18eV3uY5ihbVFcT5SkW6',
          name: '🔵 CSFeeOracle: Report settled',
          severity: Finding.Severity.INFO,
          type: Finding.FindingType.INFORMATION,
        },
      ]

      expect(results.length).toEqual(2)

      expect(results[0].getAlertid()).toEqual(expected[0].alertId)
      expect(results[0].getDescription()).toEqual(expected[0].description)
      expect(results[0].getName()).toEqual(expected[0].name)
      expect(results[0].getSeverity()).toEqual(expected[0].severity)
      expect(results[0].getType()).toEqual(expected[0].type)

      expect(results[1].getAlertid()).toEqual(expected[1].alertId)
      expect(results[1].getDescription()).toEqual(expected[1].description)
      expect(results[1].getName()).toEqual(expected[1].name)
      expect(results[1].getSeverity()).toEqual(expected[1].severity)
      expect(results[1].getType()).toEqual(expected[1].type)
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

      const expected = [
        {
          alertId: 'CSFEE-ORACLE-CONSENSUS-HASH-CONTRACT-SET',
          description:
            'Consensus hash contract set to [0xbF38618Ea09B503c1dED867156A0ea276Ca1AE37](https://etherscan.io/address/0xbF38618Ea09B503c1dED867156A0ea276Ca1AE37), previous contract was [0x0000000000000000000000000000000000000000](https://etherscan.io/address/0x0000000000000000000000000000000000000000)',
          name: '🟣 CSFeeOracle: Consensus hash contract set',
          severity: Finding.Severity.CRITICAL,
          type: Finding.FindingType.INFORMATION,
        },
        {
          alertId: 'CSFEE-ORACLE-CONSENSUS-VERSION-SET',
          description: 'Consensus version set to 1, previous version was 0',
          name: '🔴 CSFeeOracle: Consensus version set',
          severity: Finding.Severity.HIGH,
          type: Finding.FindingType.INFORMATION,
        },
        {
          alertId: 'CSFEE-ORACLE-FEE-DISTRIBUTOR-CONTRACT-SET',
          description:
            'New CSFeeDistributor contract set to [0xD7ba648C8F72669C6aE649648B516ec03D07c8ED](https://etherscan.io/address/0xD7ba648C8F72669C6aE649648B516ec03D07c8ED)',
          name: '🔴 CSFeeOracle: New CSFeeDistributor set',
          severity: Finding.Severity.HIGH,
          type: Finding.FindingType.INFORMATION,
        },
        {
          alertId: 'CSFEE-ORACLE-PERF-LEEWAY-SET',
          description: 'Performance leeway set to 500 basis points',
          name: '🔴 CSFeeOracle: Performance leeway updated',
          severity: Finding.Severity.HIGH,
          type: Finding.FindingType.INFORMATION,
        },
      ]

      expect(results.length).toEqual(4)

      expect(results[0].getAlertid()).toEqual(expected[0].alertId)
      expect(results[0].getDescription()).toEqual(expected[0].description)
      expect(results[0].getName()).toEqual(expected[0].name)
      expect(results[0].getSeverity()).toEqual(expected[0].severity)
      expect(results[0].getType()).toEqual(expected[0].type)

      expect(results[1].getAlertid()).toEqual(expected[1].alertId)
      expect(results[1].getDescription()).toEqual(expected[1].description)
      expect(results[1].getName()).toEqual(expected[1].name)
      expect(results[1].getSeverity()).toEqual(expected[1].severity)
      expect(results[1].getType()).toEqual(expected[1].type)

      expect(results[2].getAlertid()).toEqual(expected[2].alertId)
      expect(results[2].getDescription()).toEqual(expected[2].description)
      expect(results[2].getName()).toEqual(expected[2].name)
      expect(results[2].getSeverity()).toEqual(expected[2].severity)
      expect(results[2].getType()).toEqual(expected[2].type)

      expect(results[3].getAlertid()).toEqual(expected[3].alertId)
      expect(results[3].getDescription()).toEqual(expected[3].description)
      expect(results[3].getName()).toEqual(expected[3].name)
      expect(results[3].getSeverity()).toEqual(expected[3].severity)
      expect(results[3].getType()).toEqual(expected[3].type)
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

      const expected = {
        alertId: 'HASH-CONSENSUS-MEMBER-ADDED',
        description:
          'New member [0x3799bDA7B884D33F79CEC926af21160dc47fbe05](https://etherscan.io/address/0x3799bDA7B884D33F79CEC926af21160dc47fbe05) added. Total members: 10, New quorum: 6',
        name: '🔴 HashConsensus: Member added',
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
