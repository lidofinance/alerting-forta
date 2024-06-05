import { getJsonRpcUrl } from 'forta-agent'
import { ethers } from 'ethers'
import { BaseClient } from './clients/base_client'
import { EventWatcher } from './services/event_watcher'
import { getL2BridgeEvents } from './utils/events/bridge_events'
import { getGovEvents } from './utils/events/gov_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { ProxyContractClient } from './clients/proxy_contract_client'
import { Address } from './utils/constants'
import { ERC20Short__factory, L2Bridge__factory, ProxyShortABI__factory } from './generated'
import { BlockClient } from './clients/base_block_client'
import { ProxyWatcher } from './services/proxy_watcher'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { FindingsRW } from './utils/mutex'
import * as Winston from 'winston'
import { Logger } from 'winston'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { BridgeBalanceSrv } from './services/bridge_balance'
import { ETHProvider } from './clients/eth_provider_client'

export type Container = {
  ethClient: ETHProvider
  baseClient: BaseClient
  proxyWatchers: ProxyWatcher[]
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: BlockClient
  bridgeWatcher: EventWatcher
  bridgeBalanceSrc: BridgeBalanceSrv
  govWatcher: EventWatcher
  proxyEventWatcher: EventWatcher
  findingsRW: FindingsRW
  logger: Logger
  healthChecker: HealthChecker
}

export class App {
  private static instance: Container

  private constructor() {}

  public static getInstance(): Container {
    if (!App.instance) {
      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const baseNetworkID = 8453
      const baseProvider = new ethers.providers.JsonRpcProvider('https://base.llamarpc.com', baseNetworkID)
      const adr: Address = Address

      const l2Bridge = L2Bridge__factory.connect(adr.BASE_L2ERC20_TOKEN_BRIDGE_ADDRESS, baseProvider)
      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.BASE_WSTETH_ADDRESS, baseProvider)
      const baseClient = new BaseClient(baseProvider, l2Bridge, logger, bridgedWSthEthRunner)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getL2BridgeEvents(adr.BASE_L2ERC20_TOKEN_BRIDGED, adr.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.BASE_GOV_EXECUTOR_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.BASE_L2ERC20_TOKEN_BRIDGED, adr.BASE_WSTETH_BRIDGED),
        logger,
      )

      const proxyWatchers: ProxyWatcher[] = [
        new ProxyWatcher(
          new ProxyContractClient(
            adr.BASE_L2ERC20_TOKEN_BRIDGED,
            ProxyShortABI__factory.connect(adr.BASE_L2ERC20_TOKEN_BRIDGED.address, baseProvider),
          ),
          logger,
        ),
        new ProxyWatcher(
          new ProxyContractClient(
            adr.BASE_WSTETH_BRIDGED,
            ProxyShortABI__factory.connect(adr.BASE_WSTETH_BRIDGED.address, baseProvider),
          ),
          logger,
        ),
      ]

      const blockSrv: BlockClient = new BlockClient(baseClient, logger)

      const monitorWithdrawals = new MonitorWithdrawals(baseClient, adr.BASE_L2ERC20_TOKEN_BRIDGE_ADDRESS, logger)

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
        adr.BASE_L1ERC20_TOKEN_BRIDGE_ADDRESS,
        baseClient,
      )

      App.instance = {
        ethClient: ethClient,
        baseClient: baseClient,
        proxyWatchers: proxyWatchers,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
        bridgeBalanceSrc: bridgeBalanceSrv,
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
