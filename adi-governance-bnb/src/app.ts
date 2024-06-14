import { fetchJwt, Finding, getEthersProvider, verifyJwt } from 'forta-agent'
import { ETHProvider } from './clients/eth_provider'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { CROSS_CHAIN_FORWARDER_ADDRESS } from './utils/constants'
import { CrossChainForwarderSrv } from './services/cross-chain-forwarder/CrossChainForwarder.srv'

export type Container = {
  ethClient: ETHProvider
  crossChainForwarderSrv: CrossChainForwarderSrv
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

      const ethClient = new ETHProvider(ethersProvider)

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const crossChainForwarderSrv = new CrossChainForwarderSrv(logger, CROSS_CHAIN_FORWARDER_ADDRESS)

      App.instance = {
        ethClient: ethClient,
        crossChainForwarderSrv,
        findingsRW: new DataRW([]),
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
