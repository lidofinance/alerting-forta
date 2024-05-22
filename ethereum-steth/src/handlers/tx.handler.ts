import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { EvaluateTxRequest, EvaluateTxResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { newTransactionDto } from '../entity/events'
import { Finding } from '../generated/proto/alert_pb'

export class TxHandler {
  private StethOperationSrv: StethOperationSrv
  private WithdrawalsSrv: WithdrawalsSrv
  private GateSealSrv: GateSealSrv
  private VaultSrv: VaultSrv
  private healthChecker: HealthChecker

  constructor(
    StethOperationSrv: StethOperationSrv,
    WithdrawalsSrv: WithdrawalsSrv,
    GateSealSrv: GateSealSrv,
    VaultSrv: VaultSrv,
    healthChecker: HealthChecker,
  ) {
    this.StethOperationSrv = StethOperationSrv
    this.WithdrawalsSrv = WithdrawalsSrv
    this.GateSealSrv = GateSealSrv
    this.VaultSrv = VaultSrv
    this.healthChecker = healthChecker
  }

  public handleTx() {
    return async (
      call: ServerUnaryCall<EvaluateTxRequest, EvaluateTxResponse>,
      callback: sendUnaryData<EvaluateTxResponse>,
    ) => {
      const txEvent = newTransactionDto(call.request)

      const findings: Finding[] = []

      const stethOperationFindings = await this.StethOperationSrv.handleTransaction(txEvent)
      const withdrawalsFindings = await this.WithdrawalsSrv.handleTransaction(txEvent)
      const gateSealFindings = this.GateSealSrv.handleTransaction(txEvent)
      const vaultFindings = this.VaultSrv.handleTransaction(txEvent)

      findings.push(...stethOperationFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

      this.healthChecker.check(findings)

      const txResponse = new EvaluateTxResponse()
      txResponse.setStatus(ResponseStatus.SUCCESS)
      txResponse.setPrivate(false)
      txResponse.setFindingsList(findings)
      const m = txResponse.getMetadataMap()
      m.set('timestamp', new Date().toISOString())

      callback(null, txResponse)
    }
  }
}
