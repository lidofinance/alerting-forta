import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers, Finding } from 'forta-agent'
import { ScrollProvider } from './clients/scroll_provider'
import { EventWatcher } from './services/event_watcher'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContractClient } from './clients/proxy_contract_client'
import { L2LidoGateway__factory, ProxyAdmin__factory, ERC20Short__factory } from './generated'
import { BlockClient } from './clients/scroll_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import { getBridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { Constants } from './utils/constants'
import { Logger } from 'winston'
import { ETHProvider } from './clients/eth_provider_client'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { getJsonRpcUrl } from 'forta-agent/dist/sdk/utils'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'


export type Container = {
  scrollClient: ScrollProvider
  proxyWatcher: ProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockClient
  bridgeWatcher: EventWatcher
  bridgeBalanceSrv: BridgeBalanceSrv
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  findingsRW: DataRW<Finding>
  logger: Logger
  healthChecker: HealthChecker
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

      const l2Bridge = L2LidoGateway__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY.address, nodeClient)
      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.SCROLL_WSTETH_BRIDGED.address, nodeClient)

      const scrollClient = new ScrollProvider(nodeClient, l2Bridge, logger, bridgedWSthEthRunner)

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

      const blockSrv = new BlockClient(scrollClient, logger)
      const proxyWorker = new ProxyWatcher(LIDO_PROXY_CONTRACTS, logger)

      const monitorWithdrawals = new MonitorWithdrawals(scrollClient, adr.L2_ERC20_TOKEN_GATEWAY.address, logger)

      const mainnet = 1
      const drpcUrl = 'https://eth.drpc.org/'
      const ethProvider = new ethers.providers.FallbackProvider([
        new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), mainnet),
        new ethers.providers.JsonRpcProvider(drpcUrl, mainnet),
      ])

      const wSthEthRunner = ERC20Short__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
      const ethClient = new ETHProvider(logger, wSthEthRunner)
      const bridgeBalanceSrv = new BridgeBalanceSrv(logger, ethClient, scrollClient, adr.L1_ERC20_TOKEN_GATEWAY_ADDRESS)

      App.instance = {
        scrollClient: scrollClient,
        proxyWatcher: proxyWorker,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        bridgeBalanceSrv: bridgeBalanceSrv,
        govWatcher: govEventWatcher,
        proxyEventWatcher: proxyEventWatcher,
        findingsRW: new DataRW<Finding>([]),
        logger: logger,
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
