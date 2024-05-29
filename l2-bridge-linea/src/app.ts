import { LineaProvider } from './clients/linea_provider'
import { EventWatcher } from './services/event_watcher'
import { getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContract } from './clients/proxy_contract_client'
import { Address } from './utils/constants'
import { ERC20Short__factory, ProxyAdmin__factory, TokenBridge__factory } from './generated'
import { BlockClient } from './clients/linea_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { FindingsRW } from './utils/mutex'
import * as Winston from 'winston'
import { Logger } from 'winston'
import { ETHProvider } from './clients/eth_provider_client'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import { ethers } from 'ethers'

export type Container = {
  ethClient: ETHProvider
  LineaClient: LineaProvider
  proxyWatcher: ProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockClient
  bridgeWatcher: EventWatcher
  BridgeBalanceSrv: BridgeBalanceSrv
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

      const LineaRpcURL = 'https://linea.drpc.org'

      const lineaNetworkID = 59144
      const drpcLineaProvider = new ethers.providers.JsonRpcProvider(LineaRpcURL, lineaNetworkID)
      const adr: Address = Address

      const l2Bridge = TokenBridge__factory.connect(adr.LINEA_L2_TOKEN_BRIDGE, drpcLineaProvider)

      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.LINEA_WST_CUSTOM_BRIDGED_TOKEN, drpcLineaProvider)

      const lineaClient = new LineaProvider(drpcLineaProvider, l2Bridge, logger, bridgedWSthEthRunner)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getL2BridgeEvents(adr.LINEA_L2_ERC20_TOKEN_BRIDGE),
        logger,
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
          ProxyAdmin__factory.connect(adr.ADMIN_OF_LINEA_L2_TOKEN_BRIDGE, drpcLineaProvider),
        ),
        new ProxyContract(
          adr.LINEA_WST_CUSTOM_BRIDGED.name,
          adr.LINEA_WST_CUSTOM_BRIDGED.hash,
          adr.LINEA_PROXY_ADMIN_FOR_WSTETH,
          ProxyAdmin__factory.connect(adr.LINEA_PROXY_ADMIN_FOR_WSTETH, drpcLineaProvider),
        ),
      ]

      const blockSrv: BlockClient = new BlockClient(lineaClient, logger)
      const proxyWorker: ProxyWatcher = new ProxyWatcher(LIDO_PROXY_CONTRACTS, logger)

      const monitorWithdrawals = new MonitorWithdrawals(lineaClient, adr.LINEA_L2_TOKEN_BRIDGE, logger)

      const mainnet = 1
      const drpcUrl = 'https://eth.drpc.org/'
      const ethProvider = new ethers.providers.FallbackProvider([
        new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), mainnet),
        new ethers.providers.JsonRpcProvider(drpcUrl, mainnet),
      ])

      const wSthEthRunner = ERC20Short__factory.connect(adr.WSTETH_ADDRESS, ethProvider)
      const ethClient = new ETHProvider(logger, wSthEthRunner)
      const bridgeBalanceSrv = new BridgeBalanceSrv(logger, ethClient, adr.LINEA_L1_TOKEN_BRIDGE, lineaClient)

      App.instance = {
        ethClient: ethClient,
        LineaClient: lineaClient,
        BridgeBalanceSrv: bridgeBalanceSrv,
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
