import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { ethers } from 'ethers'
import { either as E } from 'fp-ts'
import { newTransactionDto, TransactionDto } from '../entity/events'
import { EvaluateTxRequest, EvaluateTxResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { Finding } from '../generated/proto/alert_pb'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { PoolBalanceSrv } from '../services/pools-balances/pool-balance.srv'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { alertId_token_rebased, LIDO_TOKEN_REBASED_EVENT } from '../utils/events/lido_events'
import { HandleTxLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'

export class TxHandler {
  private metrics: Metrics
  private stethOperationSrv: StethOperationSrv
  private withdrawalsSrv: WithdrawalsSrv
  private gateSealSrv: GateSealSrv
  private vaultSrv: VaultSrv
  private poolBalanceSrv: PoolBalanceSrv
  private healthChecker: HealthChecker

  constructor(
    metrics: Metrics,
    stethOperationSrv: StethOperationSrv,
    withdrawalsSrv: WithdrawalsSrv,
    gateSealSrv: GateSealSrv,
    vaultSrv: VaultSrv,
    poolBalanceSrv: PoolBalanceSrv,
    healthChecker: HealthChecker,
  ) {
    this.metrics = metrics
    this.stethOperationSrv = stethOperationSrv
    this.withdrawalsSrv = withdrawalsSrv
    this.gateSealSrv = gateSealSrv
    this.vaultSrv = vaultSrv
    this.poolBalanceSrv = poolBalanceSrv
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

      const stethOperationFindings = await this.stethOperationSrv.handleTransaction(txEvent)
      const withdrawalsFindings = await this.withdrawalsSrv.handleTransaction(txEvent)
      const gateSealFindings = this.gateSealSrv.handleTransaction(txEvent)
      const vaultFindings = this.vaultSrv.handleTransaction(txEvent)

      findings.push(...stethOperationFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

      const statFinding = await this.statFinding(txEvent)
      if (statFinding !== null) {
        findings.push(statFinding)
      }

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

  public async statFinding(txEvent: TransactionDto): Promise<Finding | null> {
    for (const log of txEvent.logs) {
      if (log.address.toLowerCase() !== this.stethOperationSrv.getLidoStethAddress()) {
        continue
      }

      try {
        const parser = new ethers.utils.Interface([LIDO_TOKEN_REBASED_EVENT])
        const logDesc = parser.parseLog(log)

        const f = new Finding()
        f.setName(`ℹ️ Lido: Token rebased`)
        f.setAlertid(alertId_token_rebased)
        f.setSeverity(Finding.Severity.INFO)
        f.setType(Finding.FindingType.INFORMATION)
        f.setDescription(`reportTimestamp: ${logDesc.args.reportTimestamp}`)
        f.setProtocol('ethereum')

        const state = await this.withdrawalsSrv.getStatisticString()
        if (E.isRight(state)) {
          f.setDescription(state.right)
        }

        let desc = f.getDescription()
        desc += this.poolBalanceSrv.getPoolInfo()
        f.setDescription(desc)

        return f
      } catch (e) {}
    }

    return null
  }
}
