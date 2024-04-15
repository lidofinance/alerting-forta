import { Finding, getJsonRpcUrl } from 'forta-agent'
import { MantleClient } from './clients/mantle_provider'
import { EventWatcher } from './services/event_watcher'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContractClient } from './clients/proxy_contract_client'
import { ERC20Short__factory, L2ERC20TokenBridge__factory, OssifiableProxy__factory } from './generated'
import { MantleBlockClient } from './clients/mantle_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import { getBridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { Address } from './utils/constants'
import { Logger } from 'winston'
import { ethers } from 'ethers'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { ETHProvider } from './clients/eth_provider_client'

export type Container = {
  ethClient: ETHProvider
  mantleClient: MantleClient
  proxyWatchers: ProxyWatcher[]
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: MantleBlockClient
  bridgeWatcher: EventWatcher
  bridgeBalanceSrv: BridgeBalanceSrv
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
      const mantleRpcURL = 'https://rpc.mantle.xyz'

      const baseNetworkID = 5000
      const mantleProvider = new ethers.providers.JsonRpcProvider(mantleRpcURL, baseNetworkID)

      const l2Bridge = L2ERC20TokenBridge__factory.connect(adr.MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS, mantleProvider)
      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.MANTLE_WSTETH_ADDRESS, mantleProvider)
      const mantleClient = new MantleClient(mantleProvider, logger, l2Bridge, bridgedWSthEthRunner)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getBridgeEvents(adr.MANTLE_L2ERC20_TOKEN_BRIDGE_ADDRESS, adr.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.MANTLE_GOV_EXECUTOR_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.MANTLE_WSTETH_BRIDGED, adr.MANTLE_L2ERC20_TOKEN_BRIDGED),
        logger,
      )

      const blockSrv: MantleBlockClient = new MantleBlockClient(mantleClient, logger)

      const proxyWatchers: ProxyWatcher[] = [
        new ProxyWatcher(
          new ProxyContractClient(
            adr.MANTLE_L2ERC20_TOKEN_BRIDGED.name,
            adr.MANTLE_L2ERC20_TOKEN_BRIDGED.address,
            OssifiableProxy__factory.connect(adr.MANTLE_L2ERC20_TOKEN_BRIDGED.address, mantleProvider),
          ),
          logger,
        ),
        new ProxyWatcher(
          new ProxyContractClient(
            adr.MANTLE_WSTETH_BRIDGED.name,
            adr.MANTLE_WSTETH_BRIDGED.address,
            OssifiableProxy__factory.connect(adr.MANTLE_WSTETH_BRIDGED.address, mantleProvider),
          ),
          logger,
        ),
      ]

      const monitorWithdrawals = new MonitorWithdrawals(mantleClient, adr.MANTLE_L2ERC20_TOKEN_BRIDGED.address, logger)

      const mainnet = 1
      const drpcUrl = 'https://eth.drpc.org/'
      const ethProvider = new ethers.providers.FallbackProvider([
        new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), mainnet),
        new ethers.providers.JsonRpcProvider(drpcUrl, mainnet),
      ])

      const wSthEthRunner = ERC20Short__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
      const ethClient = new ETHProvider(logger, wSthEthRunner)
      const bridgeBalanceSrv = new BridgeBalanceSrv(
        logger,
        ethClient,
        adr.MANTLE_L1ERC20_TOKEN_BRIDGE_ADDRESS,
        mantleClient,
      )

      App.instance = {
        ethClient: ethClient,
        mantleClient: mantleClient,
        proxyWatchers: proxyWatchers,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        bridgeBalanceSrv: bridgeBalanceSrv,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        findingsRW: new DataRW<Finding>([]),
        logger: logger,
      }
    }

    return App.instance
  }
}
