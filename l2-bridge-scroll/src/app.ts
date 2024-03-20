import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers, Finding } from 'forta-agent'
import { IMantleProvider, MantleProvider } from './clients/scroll_provider'
import { EventWatcher } from './services/event_watcher'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContractClient } from './clients/proxy_contract_client'
import { L2ERC20TokenBridge__factory, OssifiableProxy__factory } from './generated'
import { MantleBlockClient } from './clients/scroll_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import { getBridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { Address } from './utils/constants'
import { Logger } from 'winston'

export type Container = {
  mantleClient: IMantleProvider
  proxyWatcher: ProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: MantleBlockClient
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

      const adr: Address = Address
      const mantleRpcURL = FortaGuardClient.getSecret()

      const baseNetworkID = 5000
      const nodeClient = new ethers.providers.JsonRpcProvider(mantleRpcURL, baseNetworkID)

      const l2Bridge = L2ERC20TokenBridge__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY.hash, nodeClient)

      const mantleClient = new MantleProvider(nodeClient, logger, l2Bridge)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getBridgeEvents(adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, adr.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.GOV_BRIDGE_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.MANTLE_WST_ETH_BRIDGED, adr.L2_ERC20_TOKEN_GATEWAY),
        logger,
      )

      const LIDO_PROXY_CONTRACTS: ProxyContractClient[] = [
        new ProxyContractClient(
          adr.L2_ERC20_TOKEN_GATEWAY.name,
          adr.L2_ERC20_TOKEN_GATEWAY.hash,
          OssifiableProxy__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY.hash, nodeClient),
        ),
        new ProxyContractClient(
          adr.MANTLE_WST_ETH_BRIDGED.name,
          adr.MANTLE_WST_ETH_BRIDGED.hash,
          OssifiableProxy__factory.connect(adr.MANTLE_WST_ETH_BRIDGED.hash, nodeClient),
        ),
      ]

      const blockSrv: MantleBlockClient = new MantleBlockClient(mantleClient, logger)
      const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS, logger)

      const monitorWithdrawals = new MonitorWithdrawals(mantleClient, adr.L2_ERC20_TOKEN_GATEWAY.hash, logger)

      App.instance = {
        mantleClient: mantleClient,
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
