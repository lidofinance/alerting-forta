import { expect } from '@jest/globals'
import { ethers } from 'ethers'
import * as promClient from 'prom-client'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { BlockDto } from '../../entity/events'
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
import { IVaultClient, VaultSrv } from './Vault.srv'

const TEST_TIMEOUT = 120_000 // ms

describe('Vaults.srv functional tests', () => {
  const config = new Config()
  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })
  const address: Address = Address
  const chainId = 1

  const ethProvider = new ethers.providers.JsonRpcProvider(config.ethereumRpcUrl, chainId)
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, ethProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, ethProvider)
  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, ethProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.VEBO_ADDRESS, ethProvider)
  const registry = new promClient.Registry()
  const m = new Metrics(registry, 'test_')

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

  const vaultClient: IVaultClient = new ETHProvider(
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

  const vaultSrv = new VaultSrv(
    logger,
    vaultClient,
    address.WITHDRAWALS_VAULT_ADDRESS,
    address.EL_REWARDS_VAULT_ADDRESS,
    address.BURNER_ADDRESS,
    address.LIDO_STETH_ADDRESS,
  )

  test(
    'EL-VAULT-BALANCE-CHANGE',
    async () => {
      const blockNumber = 17_007_842
      const block = await ethProvider.getBlock(blockNumber)

      vaultSrv.initialize(blockNumber)

      const blockEvent: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
        hash: block.hash,
      }

      const result = await vaultSrv.handleBlock(blockEvent)

      const expected = {
        alertId: 'EL-VAULT-BALANCE-CHANGE',
        description: `EL Vault Balance has increased by 689.017 ETH`,
        name: 'ℹ️ EL Vault Balance significant change',
        severity: Finding.Severity.INFO,
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
})
