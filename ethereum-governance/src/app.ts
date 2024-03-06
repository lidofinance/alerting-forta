import { ethers, fetchJwt, Finding, getEthersProvider, verifyJwt } from 'forta-agent'
import { ARAGON_VOTING_ADDRESS } from 'constants/common'
import { ENS_BASE_REGISTRAR_ADDRESS } from 'constants/common'
import { ETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import {
  ENS__factory,
  IncreaseStakingLimit__factory,
  NodeOperatorsRegistry__factory,
  AragonVoting__factory,
} from './generated'
import { EnsNamesSrv } from './services/ens-names/EnsNames.srv'
import { EasyTrackSrv } from './services/easy-track/EasyTrack.srv'
import { ProxyWatcherSrv } from './services/proxy-watcher/ProxyWatcher.srv'
import { DataRW } from './utils/mutex'
import * as Winston from 'winston'
import * as E from 'fp-ts/Either'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import { INCREASE_STAKING_LIMIT_ADDRESS, NODE_OPERATORS_REGISTRY_ADDRESS } from 'constants/easy-track'
import { AclChangesSrv } from './services/acl-changes/AclChanges.srv'
import { AragonVotingSrv } from './services/aragon-voting/AragonVoting.srv'
import { TrpChangesSrv } from './services/trp-changes/TrpChanges.srv'

export type Container = {
  ethClient: ETHProvider
  EnsNamesSrv: EnsNamesSrv
  EasyTrackSrv: EasyTrackSrv
  AclChangesSrv: AclChangesSrv
  ProxyWatcherSrv: ProxyWatcherSrv
  AragonVotingSrv: AragonVotingSrv
  TrpChangesSrv: TrpChangesSrv
  findingsRW: DataRW<Finding>
  healthChecker: HealthChecker
}

export class App {
  private static instance: Container

  public static async getJwt(): Promise<E.Either<Error, string>> {
    let token: string
    try {
      token = await fetchJwt({})
    } catch (e) {
      return E.left(new Error(`Could not fetch jwt. Cause ${e}`))
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        const isTokenOk = await verifyJwt(token)
        if (!isTokenOk) {
          return E.left(new Error(`Token verification failed`))
        }
      } catch (e) {
        return E.left(new Error(`Token verification failed`))
      }
    }

    return E.right(token)
  }

  public static async getInstance(): Promise<Container> {
    if (!App.instance) {
      const etherscanKey = Buffer.from('SVZCSjZUSVBXWUpZSllXSVM0SVJBSlcyNjRITkFUUjZHVQ==', 'base64').toString('utf-8')
      const ethersProvider = getEthersProvider()
      ethersProvider.formatter = new FormatterWithEIP1898()

      const etherscanProvider = new ethers.providers.EtherscanProvider(ethersProvider.network, etherscanKey)

      const ensContact = ENS__factory.connect(ENS_BASE_REGISTRAR_ADDRESS, ethersProvider)
      const increaseStakingLimitContact = IncreaseStakingLimit__factory.connect(
        INCREASE_STAKING_LIMIT_ADDRESS,
        ethersProvider,
      )
      const nodeOperatorsRegistryContract = NodeOperatorsRegistry__factory.connect(
        NODE_OPERATORS_REGISTRY_ADDRESS,
        ethersProvider,
      )
      const aragonVotingContract = AragonVoting__factory.connect(ARAGON_VOTING_ADDRESS, ethersProvider)

      const ethClient = new ETHProvider(
        ethersProvider,
        etherscanProvider,
        ensContact,
        increaseStakingLimitContact,
        nodeOperatorsRegistryContract,
        aragonVotingContract,
      )

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const proxyWatcherSrv = new ProxyWatcherSrv(logger, ethClient)

      const ensNamesSrv = new EnsNamesSrv(logger, ethClient)
      const easyTrackSrv = new EasyTrackSrv(logger, ethClient)
      const aclChangesSrv = new AclChangesSrv(logger, ethClient)
      const aragonVotingSrv = new AragonVotingSrv(logger, ethClient)
      const trpChangesSrv = new TrpChangesSrv(logger)

      App.instance = {
        ethClient: ethClient,
        EnsNamesSrv: ensNamesSrv,
        EasyTrackSrv: easyTrackSrv,
        AclChangesSrv: aclChangesSrv,
        ProxyWatcherSrv: proxyWatcherSrv,
        AragonVotingSrv: aragonVotingSrv,
        TrpChangesSrv: trpChangesSrv,
        findingsRW: new DataRW([]),
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
