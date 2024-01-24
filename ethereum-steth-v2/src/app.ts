import { StethOperationSrv } from './services/steth_operation/StethOperation.srv'
import { ethers, Finding, getEthersProvider } from 'forta-agent'
import { Address } from './utils/constants'
import { StethOperationCache } from './services/steth_operation/StethOperation.cache'
import { ETHProvider, IETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from './generated'
import { getDepositSecurityEvents } from './utils/events/deposit_security_events'
import { getLidoEvents } from './utils/events/lido_events'
import { getInsuranceFundEvents } from './utils/events/insurance_fund_events'
import { getBurnerEvents } from './utils/events/burner_events'
import { WithdrawalsSrv } from './services/withdrawals/Withdrawals.srv'
import { WithdrawalsCache } from './services/withdrawals/Withdrawals.cache'
import { getWithdrawalsEvents } from './utils/events/withdrawals_events'
import { GateSealSrv } from './services/gate-seal/GateSeal.srv'
import { DataRW } from './utils/mutex'
import { GateSealCache } from './services/gate-seal/GateSeal.cache'
import { TestNetAddress } from './utils/constants.testnet'
import * as Winston from 'winston'
import { VaultSrv } from './services/vault/Vault.srv'

export type Container = {
  ethClient: IETHProvider
  StethOperationSrv: StethOperationSrv
  WithdrawalsSrv: WithdrawalsSrv
  GateSealSrv: GateSealSrv
  VaultSrv: VaultSrv
  findingsRW: DataRW<Finding>
}

export class App {
  private static instance: Container

  private constructor() {}

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const etherscanKey = Buffer.from('SVZCSjZUSVBXWUpZSllXSVM0SVJBSlcyNjRITkFUUjZHVQ==', 'base64').toString('utf-8')

      const etherscanProvider = new ethers.providers.EtherscanProvider(
        process.env.FORTA_AGENT_RUN_TIER == 'testnet' ? 'goerli' : undefined,
        etherscanKey,
      )

      let address: Address = Address
      if (process.env.FORTA_AGENT_RUN_TIER === 'testnet') {
        address = TestNetAddress
      }

      const ethersProvider = getEthersProvider()
      ethersProvider.formatter = new FormatterWithEIP1898()

      const lidoContact = Lido__factory.connect(address.LIDO_STETH_ADDRESS, ethersProvider)
      const wdQueueContact = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, ethersProvider)

      const gateSealContact = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, ethersProvider)
      const exitBusOracleContract = ValidatorsExitBusOracle__factory.connect(
        address.EXITBUS_ORACLE_ADDRESS,
        ethersProvider,
      )
      const ethClient = new ETHProvider(
        ethersProvider,
        etherscanProvider,
        lidoContact,
        wdQueueContact,
        gateSealContact,
        exitBusOracleContract,
      )

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const stethOperationCache = new StethOperationCache()
      const stethOperationSrv = new StethOperationSrv(
        logger,
        stethOperationCache,
        ethClient,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        lidoContact,
        wdQueueContact,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const withdrawalsSrv = new WithdrawalsSrv(
        logger,
        ethClient,
        wdQueueContact,
        lidoContact,
        new WithdrawalsCache(),
        getWithdrawalsEvents(address.WITHDRAWALS_QUEUE_ADDRESS),
      )

      const gateSealSrv = new GateSealSrv(
        logger,
        ethClient,
        new GateSealCache(),
        address.GATE_SEAL_DEFAULT_ADDRESS,
        address.GATE_SEAL_FACTORY_ADDRESS,
      )

      const vaultSrv = new VaultSrv(
        logger,
        ethClient,
        lidoContact,
        address.WITHDRAWALS_VAULT_ADDRESS,
        address.EL_REWARDS_VAULT_ADDRESS,
        address.BURNER_ADDRESS,
      )

      App.instance = {
        ethClient: ethClient,
        StethOperationSrv: stethOperationSrv,
        WithdrawalsSrv: withdrawalsSrv,
        GateSealSrv: gateSealSrv,
        VaultSrv: vaultSrv,
        findingsRW: new DataRW([]),
      }
    }

    return App.instance
  }
}
