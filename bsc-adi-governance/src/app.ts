import { Finding, getEthersProvider } from 'forta-agent'
import * as Winston from 'winston'
import { BSCProvider } from './clients/bsc_provider'
import { EventWatcherSrv } from './services/event-watcher/EventWatcher.srv'
import { CrossChainControllerSrv } from './services/cross-chain-controller/CrossChainController.srv'
import { AclChangesSrv } from './services/acl-changes/AclChanges.srv'
import { DataRW } from './utils/mutex'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { CROSS_CHAIN_CONTROLLER_ADDRESS, CROSS_CHAIN_EXECUTOR_ADDRESS } from './utils/constants'
import { CrossChainController__factory } from './generated'
import { getCrossChainExecutorEvents } from './utils/events/cross_chain_executor_events'

export type Container = {
  bscClient: BSCProvider
  crossChainControllerSrv: CrossChainControllerSrv
  crossChainExecutorWatcherSrv: EventWatcherSrv
  bscAclChangesSrv: AclChangesSrv
  findingsRW: DataRW<Finding>
  healthChecker: HealthChecker
}

export class App {
  private static instance: Container

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const ethersProvider = getEthersProvider()

      const crossChainControllerRunner = CrossChainController__factory.connect(
        CROSS_CHAIN_CONTROLLER_ADDRESS,
        ethersProvider,
      )

      const bscClient = new BSCProvider(ethersProvider, crossChainControllerRunner)

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const crossChainControllerSrv = new CrossChainControllerSrv(logger, bscClient, CROSS_CHAIN_CONTROLLER_ADDRESS)
      const crossChainExecutorWatcherSrv = new EventWatcherSrv(
        'CrossChainExecutorWatcher',
        getCrossChainExecutorEvents(CROSS_CHAIN_EXECUTOR_ADDRESS),
        logger,
      )
      const bscAclChangesSrv = new AclChangesSrv(logger, bscClient)

      App.instance = {
        bscClient,
        crossChainControllerSrv,
        crossChainExecutorWatcherSrv,
        bscAclChangesSrv,
        findingsRW: new DataRW([]),
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
