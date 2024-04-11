import { ethers, fetchJwt, getJsonRpcUrl } from 'forta-agent'
import { BaseClient } from './clients/base_client'
import { EventWatcher } from './services/event_watcher'
import { getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContractClient } from './clients/proxy_contract_client'
import { Address } from './utils/constants'
import { ERC20Short__factory, L2Bridge__factory, ProxyShortABI__factory } from './generated'
import { BlockClient } from './clients/base_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { FindingsRW } from './utils/mutex'
import * as Winston from 'winston'
import { Logger } from 'winston'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { verifyJwt } from 'forta-agent/dist/sdk/jwt'
import * as E from 'fp-ts/Either'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { ETHProvider } from './clients/eth_provider_client'

export type Container = {
  ethClient: ETHProvider
  baseClient: BaseClient
  proxyWatchers: ProxyWatcher[]
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockClient
  bridgeWatcher: EventWatcher
  bridgeBalanceSrc: BridgeBalanceSrv
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  findingsRW: FindingsRW
  logger: Logger
  healthChecker: HealthChecker
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

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const baseNetworkID = 8453
      const baseProvider = new ethers.providers.JsonRpcProvider('https://base.llamarpc.com', baseNetworkID)
      const adr: Address = Address

      const l2Bridge = L2Bridge__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, baseProvider)
      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.BASE_WST_ETH_BRIDGED_ADDRESS, baseProvider)
      const baseClient = new BaseClient(baseProvider, l2Bridge, logger, bridgedWSthEthRunner)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getL2BridgeEvents(adr.L2_ERC20_TOKEN_GATEWAY, adr.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.GOV_BRIDGE_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.L2_ERC20_TOKEN_GATEWAY, adr.BASE_WST_ETH_BRIDGED),
        logger,
      )

      const proxyWatchers: ProxyWatcher[] = [
        new ProxyWatcher(
          new ProxyContractClient(
            adr.L2_ERC20_TOKEN_GATEWAY,
            ProxyShortABI__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY.address, baseProvider),
          ),
          logger,
        ),
        new ProxyWatcher(
          new ProxyContractClient(
            adr.BASE_WST_ETH_BRIDGED,
            ProxyShortABI__factory.connect(adr.BASE_WST_ETH_BRIDGED.address, baseProvider),
          ),
          logger,
        ),
      ]

      const blockSrv: BlockClient = new BlockClient(baseClient, logger)

      const monitorWithdrawals = new MonitorWithdrawals(baseClient, adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, logger)

      const mainnet = 1
      const drpcUrl = 'https://eth.drpc.org/'
      const ethProvider = new ethers.providers.FallbackProvider([
        new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), mainnet),
        new ethers.providers.JsonRpcProvider(drpcUrl, mainnet),
      ])

      const wSthEthRunner = ERC20Short__factory.connect(adr.WSTETH_ADDRESS, ethProvider)
      const ethClient = new ETHProvider(logger, wSthEthRunner)
      const bridgeBalanceSrv = new BridgeBalanceSrv(logger, ethClient, adr.BASE_L1ERC20_TOKEN_BRIDGE, baseClient)

      App.instance = {
        ethClient: ethClient,
        baseClient: baseClient,
        proxyWatchers: proxyWatchers,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        bridgeBalanceSrc: bridgeBalanceSrv,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        findingsRW: new FindingsRW([]),
        logger: logger,
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
