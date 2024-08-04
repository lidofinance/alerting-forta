import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { EvaluateTxRequest, EvaluateTxResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { newTransactionDto } from '../entity/events'
import { Finding } from '../generated/proto/alert_pb'
import { HandleTxLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { WithdrawalSrv } from '../services/monitor_withdrawals'
import * as E from 'fp-ts/Either'
import { dbAlert } from '../utils/errors'
import { BridgeBalanceSrv } from '../services/bridge_balance'
import { EventWatcher } from '../services/event_watcher'

export class TxHandler {
  private metrics: Metrics
  private l1EventWatcher: EventWatcher
  private WithdrawalsSrv: WithdrawalSrv
  private bridgeBalanceSrv: BridgeBalanceSrv
  private readonly networkName: string

  constructor(
    metrics: Metrics,
    l1EventWatcher: EventWatcher,
    withdrawalsSrv: WithdrawalSrv,
    bridgeBalanceSrv: BridgeBalanceSrv,
    networkName: string,
  ) {
    this.metrics = metrics
    this.l1EventWatcher = l1EventWatcher
    this.WithdrawalsSrv = withdrawalsSrv
    this.bridgeBalanceSrv = bridgeBalanceSrv
    this.networkName = networkName
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

      const l1EventFindings = this.l1EventWatcher.handleLogs(txEvent.logs)
      findings.push(...l1EventFindings)

      if (this.WithdrawalsSrv.hasRebasedEvent(txEvent)) {
        const stat = await this.WithdrawalsSrv.getWithdrawalStat()
        if (E.isLeft(stat)) {
          const networkErr = dbAlert(stat.left, `Could not call repo.getWithdrawalState`, stat.left.message)
          const txResponse = new EvaluateTxResponse()
          txResponse.setStatus(ResponseStatus.ERROR)
          txResponse.setPrivate(false)
          txResponse.setFindingsList([networkErr])
          const m = txResponse.getMetadataMap()
          m.set('timestamp', new Date().toISOString())

          this.metrics.processedIterations.labels({ method: HandleTxLabel, status: StatusFail }).inc()
          end()
          callback(null, txResponse)

          return
        }

        const f: Finding = new Finding()
        f.setName(`ℹ️ ${this.networkName} digest:`)
        f.setDescription(
          `Bridge balances: \n` +
            `\tLDO:\n` +
            `\t\tL1: ${this.bridgeBalanceSrv.l1Ldo} LDO\n` +
            `\t\tL2: ${this.bridgeBalanceSrv.l2Ldo} LDO\n` +
            `\twstETH:\n` +
            `\t\tL1: ${this.bridgeBalanceSrv.l1Steth} wstETH\n` +
            `\t\tL2: ${this.bridgeBalanceSrv.l2wSteth} wstETH\n\n` +
            `Withdrawals: \n` +
            `\tAmount: ${stat.right.amount.toFixed(4)} wstETH\n` +
            `\tTotal: ${stat.right.total}`,
        )
        f.setAlertid(`${this.networkName}-digest`)
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        findings.push(f)
      }

      const txResponse = new EvaluateTxResponse()
      txResponse.setStatus(ResponseStatus.SUCCESS)
      txResponse.setPrivate(false)
      txResponse.setFindingsList(findings)
      const m = txResponse.getMetadataMap()
      m.set('timestamp', new Date().toISOString())

      this.metrics.processedIterations.labels({ method: HandleTxLabel, status: StatusOK }).inc()
      end()
      callback(null, txResponse)
    }
  }
}
