import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { CSModuleSrv } from '../services/CSModule/CSModule.srv'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { CSAccountingSrv } from '../services/CSAccounting/CSAccounting.srv'
import { CSFeeOracleSrv } from '../services/CSFeeOracle/CSFeeOracle.srv'
import { CSFeeDistributorSrv } from '../services/CSFeeDistributor/CSFeeDistributor.srv'
import { EvaluateTxRequest, EvaluateTxResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { newTransactionDto } from '../entity/events'
import { Finding } from '../generated/proto/alert_pb'
import { HandleTxLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { ProxyWatcherSrv } from '../services/ProxyWatcher/ProxyWatcher.srv'

export class TxHandler {
  private metrics: Metrics
  private csModuleSrv: CSModuleSrv
  private csFeeDistributorSrv: CSFeeDistributorSrv
  private csAccountingSrv: CSAccountingSrv
  private csFeeOracleSrv: CSFeeOracleSrv
  private proxyWatcherSrv: ProxyWatcherSrv
  private healthChecker: HealthChecker

  constructor(
    metrics: Metrics,
    csModuleSrv: CSModuleSrv,
    csFeeDistributorSrv: CSFeeDistributorSrv,
    csAccountingSrv: CSAccountingSrv,
    csFeeOracleSrv: CSFeeOracleSrv,
    proxyWatcherSrv: ProxyWatcherSrv,
    healthChecker: HealthChecker,
  ) {
    this.metrics = metrics
    this.csModuleSrv = csModuleSrv
    this.csFeeDistributorSrv = csFeeDistributorSrv
    this.csAccountingSrv = csAccountingSrv
    this.csFeeOracleSrv = csFeeOracleSrv
    this.proxyWatcherSrv = proxyWatcherSrv
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

      const csModuleFindings = this.csModuleSrv.handleTransaction(txEvent)
      const csFeeDistributorFindings = await this.csFeeDistributorSrv.handleTransaction(txEvent)
      const csAccountingFindings = this.csAccountingSrv.handleTransaction(txEvent)
      const csFeeOracleFindings = this.csFeeOracleSrv.handleTransaction(txEvent)
      const proxyWatcherFindings = this.proxyWatcherSrv.handleTransaction(txEvent)

      findings.push(
        ...(await csModuleFindings),
        ...csFeeDistributorFindings,
        ...(await csAccountingFindings),
        ...csFeeOracleFindings,
        ...proxyWatcherFindings,
      )

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
