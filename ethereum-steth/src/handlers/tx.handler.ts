import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { newTransactionDto } from '../entity/events'
import { EvaluateTxRequest, EvaluateTxResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { Finding } from '../generated/proto/alert_pb'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { HandleTxLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'

export class TxHandler {
  private metrics: Metrics
  private StethOperationSrv: StethOperationSrv
  private WithdrawalsSrv: WithdrawalsSrv
  private GateSealSrv: GateSealSrv
  private VaultSrv: VaultSrv
  private healthChecker: HealthChecker

  constructor(
    metrics: Metrics,
    StethOperationSrv: StethOperationSrv,
    WithdrawalsSrv: WithdrawalsSrv,
    GateSealSrv: GateSealSrv,
    VaultSrv: VaultSrv,
    healthChecker: HealthChecker,
  ) {
    this.metrics = metrics
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
      const end = this.metrics.summaryHandlers.labels({ method: HandleTxLabel }).startTimer()
      this.metrics.lastAgentTouch.labels({ method: HandleTxLabel }).set(new Date().getTime())

      const txEvent = newTransactionDto(call.request)

      const findings: Finding[] = []

      // TODO to group logs by needed contract addresses.
      const stethOperationFindings = await this.StethOperationSrv.handleTransaction(txEvent)
      const withdrawalsFindings = await this.WithdrawalsSrv.handleTransaction(txEvent)
      const gateSealFindings = this.GateSealSrv.handleTransaction(txEvent)
      const vaultFindings = this.VaultSrv.handleTransaction(txEvent)

      findings.push(...stethOperationFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

      const errCount = this.healthChecker.check(findings)
      errCount === 0
        ? this.metrics.processedIterations.labels({ method: HandleTxLabel, status: StatusOK }).inc()
        : this.metrics.processedIterations.labels({ method: HandleTxLabel, status: StatusFail }).inc()

      const txResponse = new EvaluateTxResponse()
      txResponse.setStatus(ResponseStatus.SUCCESS)
      txResponse.setPrivate(false)
      txResponse.setFindingsList(findings)
      const m = txResponse.getMetadataMap()
      m.set('timestamp', new Date().toISOString())

      end()
      callback(null, txResponse)
    }
  }
}
