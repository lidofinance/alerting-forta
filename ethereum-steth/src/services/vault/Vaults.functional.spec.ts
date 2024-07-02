import { BlockDto } from '../../entity/events'
import { expect } from '@jest/globals'
import { ethers } from 'ethers'
import { Finding } from '../../generated/proto/alert_pb'
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
import { IVaultClient, VaultSrv } from './Vault.srv'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'

const TEST_TIMEOUT = 120_000 // ms

describe('Vaults.srv functional tests', () => {
  const chainId = 1

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })
  const address: Address = Address

  const fortaEthersProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, chainId)
  const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, fortaEthersProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, fortaEthersProvider)
  const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(address.EXIT_BUS_ORACLE_ADDRESS, fortaEthersProvider)
  const registry = new promClient.Registry()
  const m = new Metrics(registry, 'test_')

  const vaultClient: IVaultClient = new ETHProvider(
    logger,
    m,
    fortaEthersProvider,
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
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
      const block = await fortaEthersProvider.getBlock(blockNumber)

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
