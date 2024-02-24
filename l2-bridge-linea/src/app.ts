import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers } from 'forta-agent'
import { ILineaProvider, LineaProvider } from './clients/linea_provider'
import { EventWatcher } from './services/event_watcher'
import { getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContract } from './clients/proxy_contract_client'
import { Address } from './utils/constants'
import { ProxyAdmin__factory, TokenBridge__factory } from './generated'
import { BlockClient } from './clients/linea_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { FindingsRW } from './utils/mutex'
import * as Winston from 'winston'
import { Logger } from 'winston'

export type Container = {
  LineaClient: ILineaProvider
  proxyWatcher: ProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockClient
  bridgeWatcher: EventWatcher
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  findingsRW: FindingsRW
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

      const LineaRpcURL = FortaGuardClient.getSecret()

      const lineaNetworkID = 59144
      const nodeClient = new ethers.providers.JsonRpcProvider(LineaRpcURL, lineaNetworkID)
      const adr: Address = Address

      const l2Bridge = TokenBridge__factory.connect(adr.LINEA_TOKEN_BRIDGE, nodeClient)
      const lineaClient = new LineaProvider(nodeClient, l2Bridge, logger)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getL2BridgeEvents(adr.LINEA_L2_ERC20_TOKEN_BRIDGE),
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.LINEA_BRIDGE_EXECUTOR), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.LINEA_L2_ERC20_TOKEN_BRIDGE, adr.LINEA_WST_CUSTOM_BRIDGED),
        logger,
      )

      const LIDO_PROXY_CONTRACTS: ProxyContract[] = [
        new ProxyContract(
          adr.LINEA_L2_ERC20_TOKEN_BRIDGE.name,
          adr.LINEA_L2_ERC20_TOKEN_BRIDGE.hash,
          adr.ADMIN_OF_LINEA_L2_TOKEN_BRIDGE,
          ProxyAdmin__factory.connect(adr.ADMIN_OF_LINEA_L2_TOKEN_BRIDGE, nodeClient),
        ),
        new ProxyContract(
          adr.LINEA_WST_CUSTOM_BRIDGED.name,
          adr.LINEA_WST_CUSTOM_BRIDGED.hash,
          adr.LINEA_PROXY_ADMIN_FOR_WSTETH,
          ProxyAdmin__factory.connect(adr.LINEA_PROXY_ADMIN_FOR_WSTETH, nodeClient),
        ),
      ]

      const blockSrv: BlockClient = new BlockClient(lineaClient, logger)
      const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS, logger)

      const monitorWithdrawals = new MonitorWithdrawals(lineaClient, adr.LINEA_TOKEN_BRIDGE, logger)

      App.instance = {
        LineaClient: lineaClient,
        proxyWatcher: proxyWorker,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        findingsRW: new FindingsRW([]),
        logger: logger,
      }
    }

    return App.instance
  }
}
