import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers } from 'forta-agent'
import { ILineaProvider, LineaProvider } from './clients/linea_provider'
import { EventWatcher } from './services/eventWatcher/event_watcher'
import { L2_BRIDGE_EVENTS } from './utils/events/bridge_events'
import { GOV_BRIDGE_EVENTS } from './utils/events/gov_events'
import { PROXY_ADMIN_EVENTS } from './utils/events/proxy_admin_events'
import { ProxyContract } from './entity/proxy_contract'
import {
  ADMIN_OF_LINEA_L2_TOKEN_BRIDGE,
  BRIDGING_INITIATED_EVENT,
  LINEA_L2_ERC20_TOKEN_BRIDGE,
  LINEA_TOKEN_BRIDGE,
} from './utils/constants'
import { ProxyAdmin__factory, TokenBridge__factory } from './generated'
import { BlockSrv } from './services/linea_block_service'
import { ProxyWatcher } from './workers/proxy_watcher'
import { MonitorWithdrawals } from './workers/monitor_withdrawals'
import { FindingsRW } from './utils/mutex'

export type Container = {
  LineaClient: ILineaProvider
  proxyWatcher: ProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockSrv
  bridgeWatcher: EventWatcher
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  findingsRW: FindingsRW
}

export class App {
  private static instance: Container

  private constructor() {}

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const LineaRpcURL = FortaGuardClient.getSecret()

      const lineaNetworkID = 59144
      const nodeClient = new ethers.providers.JsonRpcProvider(LineaRpcURL, lineaNetworkID)

      const LineaClient = new LineaProvider(nodeClient)

      const bridgeEventWatcher = new EventWatcher('BridgeEventWatcher', L2_BRIDGE_EVENTS)
      const govEventWatcher = new EventWatcher('GovEventWatcher', GOV_BRIDGE_EVENTS)
      const proxyEventWatcher = new EventWatcher('ProxyEventWatcher', PROXY_ADMIN_EVENTS)

      const LIDO_PROXY_CONTRACTS: ProxyContract[] = [
        new ProxyContract(
          LINEA_L2_ERC20_TOKEN_BRIDGE.name,
          LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
          ADMIN_OF_LINEA_L2_TOKEN_BRIDGE,
          ProxyAdmin__factory.connect(ADMIN_OF_LINEA_L2_TOKEN_BRIDGE, nodeClient),
        ),
        /* TODO check on 14 JAN
          new ProxyContract(
          LINEA_WST_CUSTOM_BRIDGED.name,
          LINEA_WST_CUSTOM_BRIDGED.hash,
          LINEA_PROXY_ADMIN_FOR_WSTETH,
          ProxyAdmin__factory.connect(LINEA_PROXY_ADMIN_FOR_WSTETH, nodeClient),
        ),*/
      ]

      const blockSrv: BlockSrv = new BlockSrv(LineaClient)
      const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS)
      const l2Bridge = TokenBridge__factory.connect(LINEA_TOKEN_BRIDGE, nodeClient)

      const monitorWithdrawals = new MonitorWithdrawals(l2Bridge, LINEA_TOKEN_BRIDGE, BRIDGING_INITIATED_EVENT)

      App.instance = {
        LineaClient: LineaClient,
        proxyWatcher: proxyWorker,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        findingsRW: new FindingsRW([]),
      }
    }

    return App.instance
  }
}
