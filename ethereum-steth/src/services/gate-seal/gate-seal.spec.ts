import { expect } from '@jest/globals'
import { ethers } from 'ethers'
import { either as E } from 'fp-ts'
import * as promClient from 'prom-client'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { BlockDto, TransactionDto } from '../../entity/events'
import { GateSeal } from '../../entity/gate_seal'
import { Finding } from '../../generated/proto/alert_pb'
import {
  AstETH__factory,
  ChainlinkAggregator__factory,
  CurvePool__factory,
  GateSeal__factory,
  Lido__factory,
  StableDebtStETH__factory,
  ValidatorsExitBusOracle__factory,
  VariableDebtStETH__factory,
  WithdrawalQueueERC721__factory,
} from '../../generated/typechain'
import { Address } from '../../utils/constants'
import { Config } from '../../utils/env/env'
import { Metrics } from '../../utils/metrics/metrics'
import { GateSealCache } from './GateSeal.cache'
import { GateSealSrv, IGateSealClient } from './GateSeal.srv'

const TEST_TIMEOUT = 120_000 // ms

describe('GateSeal srv functional tests', () => {
  const config = new Config()
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })
  const address: Address = Address
  const chainId = 1

  const adr: Address = Address

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, chainId)
  const lidoRunner = Lido__factory.connect(adr.LIDO_STETH_ADDRESS, ethProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(adr.WITHDRAWALS_QUEUE_ADDRESS, ethProvider)
  const gateSealRunner = GateSeal__factory.connect(adr.GATE_SEAL_DEFAULT_ADDRESS, ethProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(adr.VEBO_ADDRESS, ethProvider)
  const astRunner = AstETH__factory.connect(address.AAVE_ASTETH_ADDRESS, ethProvider)

  const stableDebtStEthRunner = StableDebtStETH__factory.connect(address.AAVE_STABLE_DEBT_STETH_ADDRESS, ethProvider)
  const variableDebtStEthRunner = VariableDebtStETH__factory.connect(
    address.AAVE_VARIABLE_DEBT_STETH_ADDRESS,
    ethProvider,
  )

  const curvePoolRunner = CurvePool__factory.connect(address.CURVE_POOL_ADDRESS, ethProvider)
  const chainlinkAggregatorRunner = ChainlinkAggregator__factory.connect(
    address.CHAINLINK_STETH_PRICE_FEED,
    ethProvider,
  )

  const registry = new promClient.Registry()
  const m = new Metrics(registry)

  const gateSealClient: IGateSealClient = new ETHProvider(
    logger,
    m,
    ethProvider,
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    astRunner,
    stableDebtStEthRunner,
    variableDebtStEthRunner,
    curvePoolRunner,
    chainlinkAggregatorRunner,
    veboRunner,
  )

  const gateSealSrv = new GateSealSrv(
    logger,
    gateSealClient,
    new GateSealCache(),
    adr.GATE_SEAL_DEFAULT_ADDRESS,
    adr.GATE_SEAL_FACTORY_ADDRESS,
  )

  test(
    'handle pause role true',
    async () => {
      const blockNumber = 20_569_059

      const block = await ethProvider.getBlock(blockNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
        hash: block.hash,
      }

      const initErr = await gateSealSrv.initialize(blockNumber)
      if (initErr instanceof Error) {
        throw initErr
      }

      const status = await gateSealClient.checkGateSeal(blockNumber, adr.GATE_SEAL_DEFAULT_ADDRESS)
      if (E.isLeft(status)) {
        throw status
      }

      const expected: GateSeal = {
        roleForWithdrawalQueue: true,
        roleForExitBus: true,
        exitBusOracleAddress: '0x0de4ea0184c2ad0baca7183356aea5b8d5bf5c6e',
        withdrawalQueueAddress: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1',
      }
      expect(status.right).toEqual(expected)

      const result = await gateSealSrv.handlePauseRole(blockDto)

      expect(result.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )

  test(
    '⚠️ GateSeal: a new instance deployed from factory',
    async () => {
      const txHash = '0x1547f17108830a92673b967aff13971fae18b4d35681b93a38a97a22083deb93'
      const trx = await ethProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
      }

      const results = gateSealSrv.handleTransaction(transactionDto)

      const expected = {
        alertId: 'GATE-SEAL-NEW-ONE-CREATED',
        description:
          'New instance address: [0x79243345eDbe01A7E42EDfF5900156700d22611c](https://etherscan.io/address/0x79243345eDbe01A7E42EDfF5900156700d22611c)\n' +
          'dev: Please, check if `GATE_SEAL_DEFAULT_ADDRESS` should be updated in the nearest future',
        name: '⚠️ GateSeal: a new instance deployed from factory',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.INFORMATION,
      }

      expect(results.length).toEqual(1)
      expect(results[0].getAlertid()).toEqual(expected.alertId)
      expect(results[0].getDescription()).toEqual(expected.description)
      expect(results[0].getName()).toEqual(expected.name)
      expect(results[0].getSeverity()).toEqual(expected.severity)
      expect(results[0].getType()).toEqual(expected.type)

      const txHashEmptyFindings = '0xb00783f3eb79bd60f63e5744bbf0cb4fdc2f98bbca54cd2d3f611f032faa6a57'

      const trxWithEmptyFindings = await ethProvider.getTransaction(txHashEmptyFindings)
      const receiptWithEmptyFindings = await trxWithEmptyFindings.wait()

      const trxDTOWithEmptyFindings: TransactionDto = {
        logs: receiptWithEmptyFindings.logs,
        to: trxWithEmptyFindings.to ? trxWithEmptyFindings.to : null,
        block: {
          timestamp: trxWithEmptyFindings.timestamp ? trxWithEmptyFindings.timestamp : new Date().getTime(),
          number: trxWithEmptyFindings.blockNumber ? trxWithEmptyFindings.blockNumber : 1,
        },
      }

      const resultsEmptyFindings = gateSealSrv.handleTransaction(trxDTOWithEmptyFindings)

      expect(resultsEmptyFindings.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )
})
