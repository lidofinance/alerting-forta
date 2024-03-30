import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers, Finding } from 'forta-agent'
import { IScrollProvider as IScrollProvider, ScrollProvider } from './clients/scroll_provider'
import { EventWatcher } from './services/event_watcher'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContractClient } from './clients/proxy_contract_client'
import { L2ERC20TokenBridge__factory, ProxyAdmin__factory } from './generated'
import { ScrollBlockClient } from './clients/scroll_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import { getBridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { Constants } from './utils/constants'
import { Logger } from 'winston'

export type Container = {
  scrollClient: IScrollProvider
  proxyWatcher: ProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: ScrollBlockClient
  bridgeWatcher: EventWatcher
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  findingsRW: DataRW<Finding>
  logger: Logger
}

export class App {
  private static instance: Container

  private constructor() {}

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const adr = Constants
      const scrollRpcURL = FortaGuardClient.getSecret()

      const nodeClient = new ethers.providers.JsonRpcProvider(scrollRpcURL, adr.L2_NETWORK_ID)

      const l2Bridge = L2ERC20TokenBridge__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY.address, nodeClient)

      const scrollClient = new ScrollProvider(nodeClient, logger, l2Bridge)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getBridgeEvents(adr.L2_ERC20_TOKEN_GATEWAY.address, adr.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.GOV_BRIDGE_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.SCROLL_WSTETH_BRIDGED, adr.L2_ERC20_TOKEN_GATEWAY),
        logger,
      )

      const LIDO_PROXY_CONTRACTS: ProxyContractClient[] = [
        new ProxyContractClient(
          adr.L2_ERC20_TOKEN_GATEWAY.name,
          adr.L2_ERC20_TOKEN_GATEWAY.address,
          ProxyAdmin__factory.connect(adr.L2_PROXY_ADMIN_CONTRACT_ADDRESS, nodeClient),
        ),
        new ProxyContractClient(
          adr.SCROLL_WSTETH_BRIDGED.name,
          adr.SCROLL_WSTETH_BRIDGED.address,
          ProxyAdmin__factory.connect(adr.L2_PROXY_ADMIN_CONTRACT_ADDRESS, nodeClient),
        ),
      ]

      const blockSrv: ScrollBlockClient = new ScrollBlockClient(scrollClient, logger)
      const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS, logger)

      const monitorWithdrawals = new MonitorWithdrawals(scrollClient, adr.L2_ERC20_TOKEN_GATEWAY.address, logger)

      App.instance = {
        scrollClient: scrollClient,
        proxyWatcher: proxyWorker,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        findingsRW: new DataRW<Finding>([]),
        logger: logger,
      }
    }

    return App.instance
  }
}
