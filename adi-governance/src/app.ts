import { fetchJwt, Finding, getEthersProvider, verifyJwt } from 'forta-agent'
import { ETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import { DataRW } from './shared/mutex'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { BnbAdiSrv } from './services/bnb-adi/BnbAdi.srv'
import { CrossChainController__factory } from './generated'
import { CROSS_CHAIN_CONTROLLER } from 'constants/common'

export type Container = {
  ethClient: ETHProvider
  BnbAdiSrv: BnbAdiSrv
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

      const crossChainControllerContract = CrossChainController__factory.connect(CROSS_CHAIN_CONTROLLER, ethersProvider)

      const ethClient = new ETHProvider(ethersProvider, crossChainControllerContract)

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const bnbAdiSrv = new BnbAdiSrv(logger, ethClient)

      App.instance = {
        ethClient: ethClient,
        BnbAdiSrv: bnbAdiSrv,
        findingsRW: new DataRW([]),
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
