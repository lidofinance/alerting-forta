import { SecretClient } from './clients/secret_client'
import { ethers } from 'forta-agent'
import { IMantleProvider, MantleProvider } from './clients/mantle_provider'
import { EventWatcher } from './services/eventWatcher/event_watcher'
import { L2_BRIDGE_EVENTS } from './utils/events/bridge_events'
import { GOV_BRIDGE_EVENTS } from './utils/events/gov_events'
import { PROXY_ADMIN_EVENTS } from './utils/events/proxy_admin_events'
import { ProxyContract } from './entity/proxy_contract'
import { L2_ERC20_TOKEN_GATEWAY, MANTLE_WST_ETH_BRIDGED, WITHDRAWAL_INITIATED_EVENT } from './utils/constants'
import { L2ERC20TokenBridge__factory, OssifiableProxy__factory } from './generated'
import { BlockSrv } from './services/mantle_block_service'
import { ProxyWatcher } from './workers/proxy_watcher'
import { MonitorWithdrawals } from './workers/monitor_withdrawals'

export type Container = {
  mantleClient: IMantleProvider
  proxyWatcher: ProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockSrv
  bridgeWatcher: EventWatcher
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  proxyWorker: ProxyWatcher
}

export class App {
  private static instance: Container

  private constructor() {}

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const mantleRpcURL = SecretClient.getSecret()

      const baseNetworkID = 5000
      const nodeClient = new ethers.providers.JsonRpcProvider(mantleRpcURL, baseNetworkID)

      const mantleClient = new MantleProvider(nodeClient)

      const bridgeEventWatcher = new EventWatcher('BridgeEventWatcher', L2_BRIDGE_EVENTS)
      const govEventWatcher = new EventWatcher('GovEventWatcher', GOV_BRIDGE_EVENTS)
      const proxyEventWatcher = new EventWatcher('ProxyEventWatcher', PROXY_ADMIN_EVENTS)

      const LIDO_PROXY_CONTRACTS: ProxyContract[] = [
        new ProxyContract(
          L2_ERC20_TOKEN_GATEWAY.name,
          L2_ERC20_TOKEN_GATEWAY.hash,
          OssifiableProxy__factory.connect(L2_ERC20_TOKEN_GATEWAY.hash, nodeClient),
        ),
        new ProxyContract(
          MANTLE_WST_ETH_BRIDGED.name,
          MANTLE_WST_ETH_BRIDGED.hash,
          OssifiableProxy__factory.connect(MANTLE_WST_ETH_BRIDGED.hash, nodeClient),
        ),
      ]

      const blockSrv: BlockSrv = new BlockSrv(mantleClient)
      const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS)

      const l2Bridge = L2ERC20TokenBridge__factory.connect(L2_ERC20_TOKEN_GATEWAY.hash, nodeClient)

      const monitorWithdrawals = new MonitorWithdrawals(
        l2Bridge,
        L2_ERC20_TOKEN_GATEWAY.hash,
        WITHDRAWAL_INITIATED_EVENT,
      )

      App.instance = {
        mantleClient: mantleClient,
        proxyWatcher: proxyWorker,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        proxyWorker: proxyWorker,
      }
    }

    return App.instance
  }
}
