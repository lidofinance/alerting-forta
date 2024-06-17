import BigNumber from 'bignumber.js'
import { BlockDto, TransactionDto } from '../../entity/events'
import { ethers } from 'ethers'
import { Finding } from '../../generated/proto/alert_pb'
import { Config } from '../../utils/env/env'
import * as Winston from 'winston'
import { Address } from '../../utils/constants'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from '../../generated/typechain'
import { ETHProvider } from '../../clients/eth_provider'
import { StethOperationCache } from './StethOperation.cache'
import { StethOperationSrv } from './StethOperation.srv'
import { getDepositSecurityEvents } from '../../utils/events/deposit_security_events'
import { getLidoEvents } from '../../utils/events/lido_events'
import { getInsuranceFundEvents } from '../../utils/events/insurance_fund_events'
import { getBurnerEvents } from '../../utils/events/burner_events'
import { EtherscanProviderMock } from '../../clients/mocks/mock'

const TEST_TIMEOUT = 60_000 // ms

describe('Steth.srv functional tests', () => {
  const config = new Config()

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })
  const address: Address = Address

  const fortaEthersProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, config.chainId)
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, fortaEthersProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, fortaEthersProvider)
  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.EXIT_BUS_ORACLE_ADDRESS, fortaEthersProvider)

  const ethClient = new ETHProvider(
    logger,
    fortaEthersProvider,
    EtherscanProviderMock(),
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    veboRunner,
  )

  const stethOperationCache = new StethOperationCache()
  const stethOperationSrv = new StethOperationSrv(
    logger,
    stethOperationCache,
    ethClient,
    address.DEPOSIT_SECURITY_ADDRESS,
    address.LIDO_STETH_ADDRESS,
    address.DEPOSIT_EXECUTOR_ADDRESS,
    getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
    getLidoEvents(address.LIDO_STETH_ADDRESS),
    getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
    getBurnerEvents(address.BURNER_ADDRESS),
  )

  test(
    'LOW-STAKING-LIMIT',
    async () => {
      const blockNumber = 16_704_075
      const block = await fortaEthersProvider.getBlock(blockNumber)

      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      const result = await stethOperationSrv.handleBlock(blockDto)

      const expected = {
        alertId: 'LOW-STAKING-LIMIT',
        description: `Current staking limit is lower than 10% of max staking limit`,
        name: '⚠️ Unspent staking limit below 10%',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.INFORMATION,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )

  test(
    'LOW-DEPOSIT-EXECUTOR-BALANCE',
    async () => {
      const blockNumber = 17241600
      const block = await fortaEthersProvider.getBlock(blockNumber)

      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
      }

      const result = await stethOperationSrv.handleDepositExecutorBalance(blockDto.number, blockDto.timestamp)

      const expected = {
        alertId: 'LOW-DEPOSIT-EXECUTOR-BALANCE',
        description: `Balance of deposit executor is 1.9232. This is extremely low! 😱`,
        name: '⚠️ Low deposit executor balance',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.SUSPICIOUS,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )

  test(
    'should process tx with EL rewards vault set and staking changes',
    async () => {
      const txHash = '0x11a48020ae69cf08bd063f1fbc8ecf65bd057015aaa991bf507dbc598aadb68e'

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

      const results = await stethOperationSrv.handleTransaction(transactionDto)

      const expected = [
        {
          name: '⚠️ Lido: Staking resumed',
          description: 'Staking was resumed!',
          alertId: 'LIDO-STAKING-RESUMED',
          protocol: 'ethereum',
          severity: 3,
          type: 4,
        },
        {
          name: '⚠️ Lido: Staking limit set',
          description:
            'Staking limit was set with:\n' +
            'Max staking limit: 150000000000000000000000\n' +
            'Stake limit increase per block: 23437500000000000000',
          alertId: 'LIDO-STAKING-LIMIT-SET',
          protocol: 'ethereum',
          severity: 3,
          type: 4,
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
    'Insurance fund',
    async () => {
      const txHash = '0x91c7c2f33faf3b5fb097138c1d49c1d4e83f99e1c3b346b3cad35a5928c03b3a'

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
      const results = await stethOperationSrv.handleTransaction(transactionDto)

      const expected = [
        {
          name: '🚨 Insurance fund: Ownership transferred',
          description:
            'Owner of the insurance fund was transferred from [0x0000000000000000000000000000000000000000](https://etherscan.io/address/0x0000000000000000000000000000000000000000) to [0xbD829522d4791b9660f59f5998faE451dACA4E1C](https://etherscan.io/address/0xbD829522d4791b9660f59f5998faE451dACA4E1C)',
          alertId: 'INS-FUND-OWNERSHIP-TRANSFERRED',
          protocol: 'ethereum',
          severity: 4,
          type: 4,
        },
        {
          name: '🚨 Insurance fund: Ownership transferred',
          description:
            'Owner of the insurance fund was transferred from [0xbD829522d4791b9660f59f5998faE451dACA4E1C](https://etherscan.io/address/0xbD829522d4791b9660f59f5998faE451dACA4E1C) to [0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c](https://etherscan.io/address/0x3e40D73EB977Dc6a537aF587D48316feE66E9C8c)',
          alertId: 'INS-FUND-OWNERSHIP-TRANSFERRED',
          protocol: 'ethereum',
          severity: 4,
          type: 4,
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
    'Share rate',
    async () => {
      const txHash = '0xe71ac8b9f8f7b360f5defd3f6738f8482f8c15f1dd5f6827544bef8b7b4fbd37'

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

      const results = await stethOperationSrv.handleTransaction(transactionDto)

      const expected = {
        name: 'ℹ️ Lido: Token rebased',
        description: 'reportTimestamp: 1706011211',
        alertId: 'LIDO-TOKEN-REBASED',
        severity: 1,
        type: 4,
      }

      expect(results[0].getAlertid()).toEqual(expected.alertId)
      expect(results[0].getDescription()).toEqual(expected.description)
      expect(results[0].getName()).toEqual(expected.name)
      expect(results[0].getSeverity()).toEqual(expected.severity)
      expect(results[0].getType()).toEqual(expected.type)

      expect(stethOperationSrv.getStorage().getShareRate().blockNumber).toEqual(19069339)
      expect(stethOperationSrv.getStorage().getShareRate().amount).toEqual(new BigNumber('1.1546900318248249941'))

      const findings = await stethOperationSrv.handleShareRateChange(19069340)
      expect(findings.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )
})
