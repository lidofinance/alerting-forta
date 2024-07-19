import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { InitializeRequest, InitializeResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { Logger } from 'winston'
import Version from '../utils/version'
import { elapsedTime } from '../utils/time'
import { Finding } from '../generated/proto/alert_pb'
import { WithdrawalSrv } from '../services/monitor_withdrawals'
import { either as E } from 'fp-ts'
import { L2Client } from '../clients/l2_client'
import { ProxyWatcher } from '../services/proxy_watcher'

export class InitHandler {
  private readonly logger: Logger
  private readonly appName: string
  private readonly withdrawSrv: WithdrawalSrv
  private readonly l2Client: L2Client
  private readonly proxyWatchers: ProxyWatcher[]

  private onAppStartFindings: Finding[] = []

  constructor(
    appName: string,
    logger: Logger,
    onAppStartFindings: Finding[],
    withdrawSrv: WithdrawalSrv,
    l2Client: L2Client,
    proxyWatchers: ProxyWatcher[],
  ) {
    this.appName = appName
    this.logger = logger
    this.onAppStartFindings = onAppStartFindings
    this.withdrawSrv = withdrawSrv
    this.l2Client = l2Client
    this.proxyWatchers = proxyWatchers
  }

  public handleInit() {
    return async (
      call: ServerUnaryCall<InitializeRequest, InitializeResponse>,
      callback: sendUnaryData<InitializeResponse>,
    ) => {
      const startTime = new Date().getTime()

      const f: Finding = new Finding()
      f.setName(`${this.appName} launched`)
      f.setDescription(`Version: ${Version.desc}`)
      f.setAlertid('LIDO-AGENT-LAUNCHED')
      f.setSeverity(Finding.Severity.INFO)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      const m = f.getMetadataMap()
      m.set('version.commitHash', Version.commitHash)
      m.set('version.commitMsg', Version.commitMsg)

      const resp = new InitializeResponse()
      const latestL2BlockNumber = await this.l2Client.getLatestL2Block()
      if (E.isLeft(latestL2BlockNumber)) {
        resp.setStatus(ResponseStatus.ERROR)
        this.logger.error(`Could not init. handleInit: ${latestL2BlockNumber.left.message}`)

        callback(null, resp)
        return
      }

      const withdrawalsFindings = await this.withdrawSrv.initialize(latestL2BlockNumber.right.number)
      if (E.isLeft(withdrawalsFindings)) {
        resp.setStatus(ResponseStatus.ERROR)
        this.logger.error(`Could not init. handleInit: ${withdrawalsFindings.left.message}`)

        callback(null, resp)
        return
      }

      this.onAppStartFindings.push(...withdrawalsFindings.right)

      const promises = []

      for (const proxyWatcher of this.proxyWatchers) {
        promises.push(proxyWatcher.initialize(latestL2BlockNumber.right.number))
      }

      const proxyErrors = (await Promise.all(promises)).flat()
      if (proxyErrors.length > 0) {
        resp.setStatus(ResponseStatus.ERROR)
        this.logger.error(`Could not init. proxyWatchers`)

        callback(null, resp)
        return
      }

      this.logger.info(elapsedTime(`${this.appName} started`, startTime) + '\n')

      this.onAppStartFindings.push(f)
      resp.setStatus(ResponseStatus.SUCCESS)

      callback(null, resp)
    }
  }
}
