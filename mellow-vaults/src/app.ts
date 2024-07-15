import { getEthersProvider, fetchJwt, Finding, verifyJwt } from 'forta-agent'
import { ETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import { DataRW } from './shared/mutex'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/HealthChecker.srv'
import { VaultWatcherSrv } from './services/vault-watcher/VaultWatcher.srv'
import { MultisigWatcherSrv } from './services/multisig-watcher/MultisigWatcher.srv'
import { AclChangesSrv } from './services/acl-changes/AclChanges.srv'
import { MELLOW_SYMBIOTIC_ADDRESS, VAULT_LIST } from "constants/common";
import {
  SymbioticWstETH__factory,
  Vault,
  Vault__factory,
  VaultConfigurator,
  VaultConfigurator__factory,
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

  public static async getJwt(): Promise<E.Either<Error, string>> {
    let token: string
    try {
      token = await fetchJwt({})
    } catch (e) {
      return E.left(new Error(`Could not fetch jwt. Cause ${e}`))
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        const isTokenOk = await verifyJwt(token)
        if (!isTokenOk) {
          return E.left(new Error(`Token verification failed`))
        }
      } catch (e) {
        return E.left(new Error(`Token verification failed`))
      }
    }

    return E.right(token)
  }

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const ethersProvider = getEthersProvider()
      ethersProvider.formatter = new FormatterWithEIP1898()

      const VaultContracts: Vault[] = []
      const VaultConfiguratorContracts: VaultConfigurator[] = []
      VAULT_LIST.forEach(vault => {
        VaultContracts.push(Vault__factory.connect(vault.vault, ethersProvider))
        VaultConfiguratorContracts.push(VaultConfigurator__factory.connect(vault.configurator, ethersProvider))
      })
      const mellowSymbioticContract = SymbioticWstETH__factory.connect(MELLOW_SYMBIOTIC_ADDRESS, ethersProvider)

      const ethClient = new ETHProvider(ethersProvider, mellowSymbioticContract, VaultContracts, VaultConfiguratorContracts)

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
