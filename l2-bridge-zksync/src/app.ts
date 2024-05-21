import { ethers, Finding, getJsonRpcUrl } from 'forta-agent'
import { ZkSyncClient } from './clients/zksync_client'
import { ERC20Short__factory, L2ERC20Bridge__factory, OssifiableProxy__factory, ProxyAdmin__factory } from './generated'
import { ZkSyncBlockClient } from './clients/zksync_block_client'
import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import { Address } from './utils/constants'
import { Logger } from 'winston'
import { EventWatcher } from './services/event_watcher'
import { getBridgeEvents } from './utils/events/bridge_events'
import { getProxyAdminEvents } from './utils/events/proxy_admin_events'
import { getGovEvents } from './utils/events/gov_events'
import { TProxyWatcher } from './services/t_proxy_watcher'
import { TProxyContractClient } from './clients/transparent_proxy_contract_client'
import { OProxyWatcher } from './services/o_proxy_watcher'
import { OProxyContractClient } from './clients/ossifiable_proxy_contract_client'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { EthClient } from './clients/eth_provider_client'
import { BridgeBalanceSrv } from './services/bridge_balance'

export type Container = {
  ethClient: EthClient
  zkSyncClient: ZkSyncClient
  tProxyWatchers: TProxyWatcher[]
  oProxyWatcher: OProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: ZkSyncBlockClient
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

      const adr: Address = Address
      const zkSyncRpcURL = 'https://mainnet.era.zksync.io'

      const zkSyncNetworkID = 324
      const zkSyncProvider = new ethers.providers.JsonRpcProvider(zkSyncRpcURL, zkSyncNetworkID)

      const zkSyncL2BridgeRunner = L2ERC20Bridge__factory.connect(
        adr.ZKSYNC_L2ERC20_TOKEN_BRIDGE_ADDRESS,
        zkSyncProvider,
      )

      const bridgedWSthEthRunner = ERC20Short__factory.connect(adr.ZKSYNC_WSTETH_BRIDGED_ADDRESS, zkSyncProvider)
      const zkSyncClient = new ZkSyncClient(zkSyncProvider, logger, zkSyncL2BridgeRunner, bridgedWSthEthRunner)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getBridgeEvents(adr.ZKSYNC_L2ERC20_TOKEN_BRIDGE_ADDRESS, adr.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.ZKSYNC_GOV_EXECUTOR_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.ZKSYNC_WSTETH_BRIDGED, adr.ZKSYNC_BRIDGE_EXECUTOR),
        logger,
      )

      const tProxyWatchers: TProxyWatcher[] = [
        new TProxyWatcher(
          new TProxyContractClient(
            ProxyAdmin__factory.connect(adr.ZKSYNC_WSTETH_BRIDGED.proxyAdminAddress, zkSyncProvider),
            adr.ZKSYNC_WSTETH_BRIDGED,
          ),
          logger,
        ),
        new TProxyWatcher(
          new TProxyContractClient(
            ProxyAdmin__factory.connect(adr.ZKSYNC_BRIDGE_EXECUTOR.proxyAdminAddress, zkSyncProvider),
            adr.ZKSYNC_BRIDGE_EXECUTOR,
          ),
          logger,
        ),
      ]

      const oProxyWorker: OProxyWatcher = new OProxyWatcher(
        new OProxyContractClient(
          OssifiableProxy__factory.connect(adr.ZKSYNC_L2ERC20_TOKEN_BRIDGED.address, zkSyncProvider),
          adr.ZKSYNC_L2ERC20_TOKEN_BRIDGED,
        ),
        logger,
      )
      const blockSrv: ZkSyncBlockClient = new ZkSyncBlockClient(zkSyncClient, logger)
      const monitorWithdrawals = new MonitorWithdrawals(zkSyncClient, adr.ZKSYNC_L2ERC20_TOKEN_BRIDGE_ADDRESS, logger)

      const mainnet = 1
      const drpcUrl = 'https://eth.drpc.org/'
      const ethProvider = new ethers.providers.FallbackProvider([
        new ethers.providers.JsonRpcProvider(getJsonRpcUrl(), mainnet),
        new ethers.providers.JsonRpcProvider(drpcUrl, mainnet),
      ])

      const wSthEthRunner = ERC20Short__factory.connect(adr.L1_WSTETH_ADDRESS, ethProvider)
      const ethClient = new EthClient(logger, wSthEthRunner)
      const bridgeBalanceSrv = new BridgeBalanceSrv(
        logger,
        ethClient,
        zkSyncClient,
        adr.ZKSYNC_L1ERC20_TOKEN_BRIDGE_ADDRESS,
      )

      App.instance = {
        ethClient: ethClient,
        zkSyncClient: zkSyncClient,
        tProxyWatchers: tProxyWatchers,
        oProxyWatcher: oProxyWorker,
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
