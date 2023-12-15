import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers } from 'forta-agent'
import { ILineaProvider, LineaProvider } from './clients/linea_provider'
import { EventWatcher } from './services/eventWatcher/event_watcher'
import { L2_BRIDGE_EVENTS } from './utils/events/bridge_events'
import { GOV_BRIDGE_EVENTS } from './utils/events/gov_events'
import { PROXY_ADMIN_EVENTS } from './utils/events/proxy_admin_events'
import { ProxyContract } from './entity/proxy_contract'
import {
  BRIDGING_INITIATED_EVENT,
  LINEA_L2_ERC20_TOKEN_BRIDGE,
  LINEA_TOKEN_BRIDGE,
  LINEA_WST_CUSTOM_BRIDGED,
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
          ProxyAdmin__factory.connect(LINEA_L2_ERC20_TOKEN_BRIDGE.hash, nodeClient),
        ),
        new ProxyContract(
          LINEA_WST_CUSTOM_BRIDGED.name,
          LINEA_WST_CUSTOM_BRIDGED.hash,
          ProxyAdmin__factory.connect(LINEA_WST_CUSTOM_BRIDGED.hash, nodeClient),
        ),
      ]

      const blockSrv: BlockSrv = new BlockSrv(LineaClient)
      const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS)

      // TODO ask what is the contract for here. And where to get it
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
