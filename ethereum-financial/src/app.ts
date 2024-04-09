import { ethers, fetchJwt, Finding, getEthersProvider, verifyJwt } from 'forta-agent'
import { Address } from './utils/constants'
import { ETHProvider } from './clients/eth_provider'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { AaveSrv } from './services/aave/Aave.srv'
import {
  AstETH__factory,
  ChainlinkAggregator__factory,
  CurvePool__factory,
  LidoDAO__factory,
  StableDebtStETH__factory,
  VariableDebtStETH__factory,
} from './generated'
import { Logger } from 'winston'
import { PoolBalanceSrv } from './services/pools-balances/pool-balance.srv'
import { PoolBalanceCache } from './services/pools-balances/pool-balance.cache'

export type Container = {
  logger: Logger
  ethClient: ETHProvider
  AaveSrv: AaveSrv
  PoolBalanceSrv: PoolBalanceSrv
  PoolBalanceCache: PoolBalanceCache
  healthChecker: HealthChecker
  findingsRW: DataRW<Finding>
}

export class App {
  private static instance: Container

  private constructor() {}

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

  public static async getInstance(rpcUrl?: string): Promise<Container> {
    if (!App.instance) {
      let ethersProvider = getEthersProvider()
      if (rpcUrl !== undefined) {
        ethersProvider = new ethers.providers.JsonRpcProvider(rpcUrl)
      }

      const address: Address = Address

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const stethContract = LidoDAO__factory.connect(address.STETH_ADDRESS, ethersProvider)
      const astETHContract = AstETH__factory.connect(address.AAVE_ASTETH_ADDRESS, ethersProvider)
      const stableDebtStEthContract = StableDebtStETH__factory.connect(
        address.AAVE_STABLE_DEBT_STETH_ADDRESS,
        ethersProvider,
      )
      const variableDebtStEthContract = VariableDebtStETH__factory.connect(
        address.AAVE_VARIABLE_DEBT_STETH_ADDRESS,
        ethersProvider,
      )

      const curveStableSwapContract = CurvePool__factory.connect(address.CURVE_POOL_ADDRESS, ethersProvider)

      const chainlinkAggregatorContract = ChainlinkAggregator__factory.connect(
        address.CHAINLINK_STETH_PRICE_FEED,
        ethersProvider,
      )
      const ethClient = new ETHProvider(
        logger,
        ethersProvider,
        stethContract,
        astETHContract,
        stableDebtStEthContract,
        variableDebtStEthContract,
        curveStableSwapContract,
        chainlinkAggregatorContract,
      )

      const aaveSrv = new AaveSrv(logger, ethClient, address.AAVE_ASTETH_ADDRESS)
      const poolBalanceCache = new PoolBalanceCache()
      const poolBalanceSrv = new PoolBalanceSrv(logger, ethClient, poolBalanceCache)

      App.instance = {
        logger: logger,
        ethClient: ethClient,
        AaveSrv: aaveSrv,
        PoolBalanceSrv: poolBalanceSrv,
        PoolBalanceCache: poolBalanceCache,
        findingsRW: new DataRW([]),
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
