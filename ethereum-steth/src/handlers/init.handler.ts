import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { InitializeRequest, InitializeResponse, ResponseStatus, Error as pbError } from '../generated/proto/agent_pb'
import { Logger } from 'winston'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { Metadata } from '../entity/metadata'
import Version from '../utils/version'
import { elapsedTime } from '../utils/time'
import { ETH_DECIMALS } from '../utils/constants'
import { Finding } from '../generated/proto/alert_pb'

export class InitHandler {
  private readonly logger: Logger
  private readonly StethOperationSrv: StethOperationSrv
  private readonly WithdrawalsSrv: WithdrawalsSrv
  private readonly GateSealSrv: GateSealSrv
  private readonly VaultSrv: VaultSrv
  private readonly appName: string
  private readonly latestBlockNumber: number

  private onAppStartFindings: Finding[] = []

  constructor(
    appName: string,
    logger: Logger,
    StethOperationSrv: StethOperationSrv,
    WithdrawalsSrv: WithdrawalsSrv,
    GateSealSrv: GateSealSrv,
    VaultSrv: VaultSrv,
    onAppStartFindings: Finding[],
    latestBlockNumber: number,
  ) {
    this.appName = appName
    this.logger = logger
    this.StethOperationSrv = StethOperationSrv
    this.WithdrawalsSrv = WithdrawalsSrv
    this.GateSealSrv = GateSealSrv
    this.VaultSrv = VaultSrv
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
        this.StethOperationSrv.getName(),
        this.WithdrawalsSrv.getName(),
        this.GateSealSrv.getName(),
        this.VaultSrv.getName(),
      ]
      metadata.agents = '[' + agents.toString() + ']'

      const withdrawalsSrvErr = await this.WithdrawalsSrv.initialize(this.latestBlockNumber)
      if (withdrawalsSrvErr !== null) {
        this.logger.error('Could not init withdrawalsSrvErr', withdrawalsSrvErr)
        const err = new pbError()
        err.setMessage(`Could not init withdrawalsSrvErr ${withdrawalsSrvErr}`)

        const resp = new InitializeResponse()
        resp.setStatus(ResponseStatus.ERROR)
        resp.addErrors(err)

        callback(null, resp)
        return
      }

      const f: Finding = new Finding()
      f.setName(`${this.appName} launched`)
      f.setDescription(`Version: ${Version.desc}`)
      f.setAlertid('LIDO-AGENT-LAUNCHED')
      f.setSeverity(Finding.Severity.INFO)
      f.setType(Finding.FindingType.INFORMATION)
      f.setProtocol('ethereum')

      this.logger.info(
        `[${this.StethOperationSrv.getName()}] Last Depositor TxTime: ${new Date(
          this.StethOperationSrv.getStorage().getLastDepositorTxTime() * 1000,
        ).toUTCString()}`,
      )
      this.logger.info(
        `[${this.StethOperationSrv.getName()}] Buffered Eth: ${this.StethOperationSrv.getStorage()
          .getLastBufferedEth()
          .div(ETH_DECIMALS)
          .toFixed(2)}`,
      )
      this.logger.info(elapsedTime('Agent.initialize', startTime) + '\n')

      this.onAppStartFindings.push(f)
      const resp = new InitializeResponse()
      resp.setStatus(ResponseStatus.SUCCESS)

      callback(null, resp)
    }
  }
}
