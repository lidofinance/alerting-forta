import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers, fetchJwt } from 'forta-agent'
import { IProvider, BaseLineaProvider } from './clients/base_provider'
import { EventWatcher } from './services/event_watcher'
import { getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContractClient } from './clients/proxy_contract_client'
import { Address } from './utils/constants'
import { L2Bridge__factory, ProxyShortABI__factory } from './generated'
import { BlockClient } from './clients/base_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { FindingsRW } from './utils/mutex'
import * as Winston from 'winston'
import { Logger } from 'winston'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { verifyJwt } from 'forta-agent/dist/sdk/jwt'
import * as E from 'fp-ts/Either'

export type Container = {
  baseClient: IProvider
  proxyWatchers: ProxyWatcher[]
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockClient
  bridgeWatcher: EventWatcher
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

      const baseRpcURL = FortaGuardClient.getSecret()

      const baseNetworkID = 8453
      const nodeClient = new ethers.providers.JsonRpcProvider(baseRpcURL, baseNetworkID)
      const adr: Address = Address

      const l2Bridge = L2Bridge__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, nodeClient)
      const baseClient = new BaseLineaProvider(nodeClient, l2Bridge, logger)

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
            ProxyShortABI__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY.address, nodeClient),
          ),
          logger,
        ),
        new ProxyWatcher(
          new ProxyContractClient(
            adr.BASE_WST_ETH_BRIDGED,
            ProxyShortABI__factory.connect(adr.BASE_WST_ETH_BRIDGED.address, nodeClient),
          ),
          logger,
        ),
      ]

      const blockSrv: BlockClient = new BlockClient(baseClient, logger)

      const monitorWithdrawals = new MonitorWithdrawals(baseClient, adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, logger)

      App.instance = {
        baseClient: baseClient,
        proxyWatchers: proxyWatchers,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
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
