import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { EvaluateTxRequest, EvaluateTxResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { newTransactionDto } from '../entity/events'
import { Finding } from '../generated/proto/alert_pb'
import { HandleTxLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { MonitorWithdrawals } from '../services/monitor_withdrawals'
import { EventWatcher } from '../services/event_watcher'

export class TxHandler {
  private metrics: Metrics
  private bridgeWatcher: EventWatcher
  private govWatcher: EventWatcher
  private proxyWatcher: EventWatcher
  private WithdrawalsSrv: MonitorWithdrawals
  private healthChecker: HealthChecker

  constructor(
    metrics: Metrics,
    bridgeWatcher: EventWatcher,
    govWatcher: EventWatcher,
    proxyWatcher: EventWatcher,
    WithdrawalsSrv: MonitorWithdrawals,
    healthChecker: HealthChecker,
  ) {
    this.metrics = metrics
    this.bridgeWatcher = bridgeWatcher
    this.WithdrawalsSrv = WithdrawalsSrv
    this.govWatcher = govWatcher
    this.proxyWatcher = proxyWatcher
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

      const bridgeFindings = this.bridgeWatcher.handleL2Logs(txEvent.logs)
      const govFindings = this.govWatcher.handleL2Logs(txEvent.logs)
      const proxyFindings = this.proxyWatcher.handleL2Logs(txEvent.logs)
      this.WithdrawalsSrv.handleTransaction(txEvent)

      findings.push(...bridgeFindings, ...govFindings, ...proxyFindings)

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
