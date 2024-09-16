import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { Logger } from 'winston'
import { BlockDto } from '../entity/events'
import { Metadata } from '../entity/metadata'
import { InitializeRequest, InitializeResponse, Error as pbError, ResponseStatus } from '../generated/proto/agent_pb'
import { Finding } from '../generated/proto/alert_pb'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { PoolBalanceSrv } from '../services/pools-balances/pool-balance.srv'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { ETH_DECIMALS } from '../utils/constants'
import { elapsedTime } from '../utils/time'
import Version from '../utils/version'

export class InitHandler {
  private readonly logger: Logger
  private readonly stethOperationSrv: StethOperationSrv
  private readonly withdrawalsSrv: WithdrawalsSrv
  private readonly gateSealSrv: GateSealSrv
  private readonly vaultSrv: VaultSrv
  private readonly poolBalanceSrv: PoolBalanceSrv
  private readonly appName: string
  private readonly latestBlock: BlockDto

  private onAppStartFindings: Finding[] = []

  constructor(
    appName: string,
    logger: Logger,
    StethOperationSrv: StethOperationSrv,
    WithdrawalsSrv: WithdrawalsSrv,
    GateSealSrv: GateSealSrv,
    VaultSrv: VaultSrv,
    poolBalanceSrv: PoolBalanceSrv,
    onAppStartFindings: Finding[],
    latestBlock: BlockDto,
  ) {
    this.appName = appName
    this.logger = logger
    this.stethOperationSrv = StethOperationSrv
    this.withdrawalsSrv = WithdrawalsSrv
    this.gateSealSrv = GateSealSrv
    this.vaultSrv = VaultSrv
    this.onAppStartFindings = onAppStartFindings
    this.poolBalanceSrv = poolBalanceSrv
    this.latestBlock = latestBlock
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
        this.stethOperationSrv.getName(),
        this.withdrawalsSrv.getName(),
        this.gateSealSrv.getName(),
        this.vaultSrv.getName(),
      ]
      metadata.agents = '[' + agents.toString() + ']'

      const withdrawalsSrvErr = await this.withdrawalsSrv.initialize(this.latestBlock.number)
      if (withdrawalsSrvErr !== null) {
        this.logger.error('Could not init withdrawalsSrv', withdrawalsSrvErr)
        const err = new pbError()
        err.setMessage(`Could not init withdrawalsSrvErr ${withdrawalsSrvErr}`)

        const resp = new InitializeResponse()
        resp.setStatus(ResponseStatus.ERROR)
        resp.addErrors(err)

        callback(null, resp)
        return
      }

      const poolBalanceErr = await this.poolBalanceSrv.init(this.latestBlock)
      if (poolBalanceErr !== null) {
        this.logger.error('Could not init poolBalanceSrv', poolBalanceErr)
        const err = new pbError()
        err.setMessage(`Could not init poolBalanceSrv ${poolBalanceErr}`)

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
        `[${this.stethOperationSrv.getName()}] Last Depositor TxTime: ${new Date(
          this.stethOperationSrv.getStorage().getLastDepositorTxTime() * 1000,
        ).toUTCString()}`,
      )
      this.logger.info(
        `[${this.stethOperationSrv.getName()}] Buffered Eth: ${this.stethOperationSrv
          .getStorage()
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
