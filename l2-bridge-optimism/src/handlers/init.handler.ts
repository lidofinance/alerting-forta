import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { InitializeRequest, InitializeResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { Logger } from 'winston'
import Version from '../utils/version'
import { elapsedTime } from '../utils/time'
import { Finding } from '../generated/proto/alert_pb'

export class InitHandler {
  private readonly logger: Logger
  private readonly appName: string

  private onAppStartFindings: Finding[] = []

  constructor(appName: string, logger: Logger, onAppStartFindings: Finding[]) {
    this.appName = appName
    this.logger = logger
    this.onAppStartFindings = onAppStartFindings
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

      this.logger.info(elapsedTime('L2 bridge optimism started', startTime) + '\n')

      this.onAppStartFindings.push(f)
      const resp = new InitializeResponse()
      resp.setStatus(ResponseStatus.SUCCESS)

      callback(null, resp)
    }
  }
}
