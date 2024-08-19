import { getEthersProvider, Finding, ethers } from 'forta-agent'
import { ETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import { DataRW } from './shared/mutex'
import * as Winston from 'winston'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/HealthChecker.srv'
import { VaultWatcherSrv } from './services/vault-watcher/VaultWatcher.srv'
import { MultisigWatcherSrv } from './services/multisig-watcher/MultisigWatcher.srv'
import { AclChangesSrv } from './services/acl-changes/AclChanges.srv'
import { MELLOW_SYMBIOTIC_ADDRESS, VAULT_LIST, WSTETH_ADDRESS } from 'constants/common'
import {
  SymbioticWstETH__factory,
  Vault,
  Vault__factory,
  VaultConfigurator,
  VaultConfigurator__factory,
  WStETH__factory,
} from './generated'

export type Container = {
  ethClient: ETHProvider
  VaultWatcherSrv: VaultWatcherSrv
  MultisigWatcherSrv: MultisigWatcherSrv
  AclChangesSrv: AclChangesSrv
  findingsRW: DataRW<Finding>
  healthChecker: HealthChecker
}

export class App {
  private static instance: Container

  public static prepareClient = (provider: ethers.providers.JsonRpcProvider) => {
    const VaultContracts: Vault[] = []
    const VaultConfiguratorContracts: VaultConfigurator[] = []
    VAULT_LIST.forEach((vault) => {
      VaultContracts.push(Vault__factory.connect(vault.vault, provider))
      VaultConfiguratorContracts.push(VaultConfigurator__factory.connect(vault.configurator, provider))
    })
    const mellowSymbioticContract = SymbioticWstETH__factory.connect(MELLOW_SYMBIOTIC_ADDRESS, provider)
    const wStETHContract = WStETH__factory.connect(WSTETH_ADDRESS, provider)
    const ethClient = new ETHProvider(
      provider,
      mellowSymbioticContract,
      VaultContracts,
      VaultConfiguratorContracts,
      wStETHContract,
    )
    return ethClient
  }

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const ethersProvider = getEthersProvider()
      ethersProvider.formatter = new FormatterWithEIP1898()

      const ethClient = App.prepareClient(ethersProvider)

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const vaultWatcherSrv = new VaultWatcherSrv(logger, ethClient)
      const multisigWatcherSrv = new MultisigWatcherSrv(logger)
      const aclChangesSrv = new AclChangesSrv(logger, ethClient)

      App.instance = {
        ethClient: ethClient,
        VaultWatcherSrv: vaultWatcherSrv,
        MultisigWatcherSrv: multisigWatcherSrv,
        AclChangesSrv: aclChangesSrv,
        findingsRW: new DataRW([]),
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
