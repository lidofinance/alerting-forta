import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { InitializeRequest, InitializeResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { Logger } from 'winston'
import { CSFeeDistributorSrv } from '../services/CSFeeDistributor/CSFeeDistributor.srv'
import { CSModuleSrv } from '../services/CSModule/CSModule.srv'
import { CSAccountingSrv } from '../services/CSAccounting/CSAccounting.srv'
import { CSFeeOracleSrv } from '../services/CSFeeOracle/CSFeeOracle.srv'
import { Metadata } from '../entity/metadata'
import Version from '../utils/version'
import { elapsedTime } from '../utils/time'
import { Finding } from '../generated/proto/alert_pb'
import { ProxyWatcherSrv } from '../services/ProxyWatcher/ProxyWatcher.srv'

export class InitHandler {
  private readonly logger: Logger
  private readonly csModuleSrv: CSModuleSrv
  private readonly csFeeDistributorSrv: CSFeeDistributorSrv
  private readonly csAccountingSrv: CSAccountingSrv
  private readonly csFeeOracleSrv: CSFeeOracleSrv
  private readonly proxyWatcherSrv: ProxyWatcherSrv
  private readonly appName: string
  private readonly latestBlockNumber: number

  private onAppStartFindings: Finding[] = []

  constructor(
    appName: string,
    logger: Logger,
    csModuleSrv: CSModuleSrv,
    csFeeDistributorSrv: CSFeeDistributorSrv,
    csAccountingSrv: CSAccountingSrv,
    csFeeOracleSrv: CSFeeOracleSrv,
    proxyWatcherSrv: ProxyWatcherSrv,
    onAppStartFindings: Finding[],
    latestBlockNumber: number,
  ) {
    this.appName = appName
    this.logger = logger
    this.csModuleSrv = csModuleSrv
    this.csFeeDistributorSrv = csFeeDistributorSrv
    this.csAccountingSrv = csAccountingSrv
    this.csFeeOracleSrv = csFeeOracleSrv
    this.proxyWatcherSrv = proxyWatcherSrv
    this.onAppStartFindings = onAppStartFindings
    this.latestBlockNumber = latestBlockNumber
  }

  public handleInit() {
    return async (
      call: ServerUnaryCall<InitializeRequest, InitializeResponse>,
      callback: sendUnaryData<InitializeResponse>,
    ) => {
      const startTime = new Date().getTime()

      const metadata: Metadata = {
        'version.commitHash': Version.commitHash,
        'version.commitMsg': Version.commitMsg,
      }

      const agents: string[] = [
        this.csModuleSrv.getName(),
        this.csFeeDistributorSrv.getName(),
        this.csAccountingSrv.getName(),
        this.csFeeOracleSrv.getName(),
        this.proxyWatcherSrv.getName(),
      ]
      metadata.agents = '[' + agents.toString() + ']'

      await this.csModuleSrv.initialize(this.latestBlockNumber)
      await this.csFeeDistributorSrv.initialize(this.latestBlockNumber)
      await this.csAccountingSrv.initialize(this.latestBlockNumber)
      await this.csFeeOracleSrv.initialize(this.latestBlockNumber)
      await this.proxyWatcherSrv.initialize(this.latestBlockNumber)

      const f: Finding = new Finding()
      f.setName(`${this.appName} launched`)
      f.setDescription(`Version: ${Version.desc}`)
      f.setAlertid('LIDO-AGENT-LAUNCHED')
      f.setSeverity(Finding.Severity.INFO)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      this.onAppStartFindings.push(f)

      this.logger.info(elapsedTime('Agent.initialize', startTime) + '\n')

      const resp = new InitializeResponse()
      resp.setStatus(ResponseStatus.SUCCESS)

      callback(null, resp)
    }
  }
}
