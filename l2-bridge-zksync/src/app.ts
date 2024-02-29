import { FortaGuardClient } from './clients/forta_guard_client'
import { ethers, Finding } from 'forta-agent'
import { ZkSyncProvider } from './clients/zksync_provider'
import { L2ERC20Bridge__factory, OssifiableProxy__factory, ProxyAdmin__factory } from './generated'
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

export type Container = {
  zkSyncClient: ZkSyncProvider
  tProxyWatchers: TProxyWatcher[]
  oProxyWatcher: OProxyWatcher
  monitorWithdrawals: MonitorWithdrawals
  blockSrv: ZkSyncBlockClient
  bridgeWatcher: EventWatcher
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
      const zkSyncRpcURL = FortaGuardClient.getSecret()

      const zkSyncNetworkID = 324
      const nodeClient = new ethers.providers.JsonRpcProvider(zkSyncRpcURL, zkSyncNetworkID)

      const l2Bridge = L2ERC20Bridge__factory.connect(adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, nodeClient)
      const zkSyncClient = new ZkSyncProvider(nodeClient, logger, l2Bridge)

      const bridgeEventWatcher = new EventWatcher(
        'BridgeEventWatcher',
        getBridgeEvents(adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, adr.RolesMap),
        logger,
      )
      const govEventWatcher = new EventWatcher('GovEventWatcher', getGovEvents(adr.GOV_BRIDGE_ADDRESS), logger)
      const proxyEventWatcher = new EventWatcher(
        'ProxyEventWatcher',
        getProxyAdminEvents(adr.ERC20_BRIDGED_UPGRADEABLE, adr.ZKSYNC_BRIDGE_EXECUTOR),
        logger,
      )

      const tProxyWatchers: TProxyWatcher[] = [
        new TProxyWatcher(
          new TProxyContractClient(
            adr.ERC20_BRIDGED_UPGRADEABLE,
            ProxyAdmin__factory.connect(adr.ERC20_BRIDGED_UPGRADEABLE.proxyAdminAddress, nodeClient),
          ),
          logger,
        ),
        new TProxyWatcher(
          new TProxyContractClient(
            adr.ZKSYNC_BRIDGE_EXECUTOR,
            ProxyAdmin__factory.connect(adr.ZKSYNC_BRIDGE_EXECUTOR.proxyAdminAddress, nodeClient),
          ),
          logger,
        ),
      ]

      const oProxyWorker: OProxyWatcher = new OProxyWatcher(
        new OProxyContractClient(
          adr.L2ERC20_BRIDGE,
          OssifiableProxy__factory.connect(adr.L2ERC20_BRIDGE.address, nodeClient),
        ),
        logger,
      )
      const blockSrv: ZkSyncBlockClient = new ZkSyncBlockClient(zkSyncClient, logger)
      const monitorWithdrawals = new MonitorWithdrawals(zkSyncClient, adr.L2_ERC20_TOKEN_GATEWAY_ADDRESS, logger)

      App.instance = {
        zkSyncClient: zkSyncClient,
        tProxyWatchers: tProxyWatchers,
        oProxyWatcher: oProxyWorker,
        monitorWithdrawals: monitorWithdrawals,
        blockSrv: blockSrv,
        bridgeWatcher: bridgeEventWatcher,
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
