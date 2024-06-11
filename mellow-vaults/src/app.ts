import { getEthersProvider, fetchJwt, Finding, verifyJwt } from 'forta-agent'
import { LIDO_STETH_ADDRESS } from 'constants/common'
import { ETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import { DataRW } from './shared/mutex'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/HealthChecker.srv'
import { LidoDAO__factory } from './generated'
import { VaultWatcherSrv } from './services/vault-watcher/VaultWatcher.srv'
import { MultisigWatcherSrv } from './services/multisig-watcher/MultisigWatcher.srv'

export type Container = {
  ethClient: ETHProvider
  VaultWatcherSrv: VaultWatcherSrv
  MultisigWatcherSrv: MultisigWatcherSrv
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

      const stethContract = LidoDAO__factory.connect(LIDO_STETH_ADDRESS, ethersProvider)

      const ethClient = new ETHProvider(ethersProvider, stethContract)

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const vaultWatcherSrv = new VaultWatcherSrv(logger, ethClient)
      const multisigWatcherSrv = new MultisigWatcherSrv(logger)

      App.instance = {
        ethClient: ethClient,
        VaultWatcherSrv: vaultWatcherSrv,
        MultisigWatcherSrv: multisigWatcherSrv,
        findingsRW: new DataRW([]),
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
