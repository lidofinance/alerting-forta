import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { BlockEvent, EvaluateBlockRequest, EvaluateBlockResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import BigNumber from 'bignumber.js'
import { Finding } from '../generated/proto/alert_pb'
import { HandleBlockLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { MonitorWithdrawals } from '../services/monitor_withdrawals'
import { BlockDto } from '../entity/blockDto'
import { ProxyWatcher } from '../services/proxy_watcher'
import { BridgeBalanceSrv } from '../services/bridge_balance'
import { ETHProvider } from '../clients/eth_provider_client'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../utils/errors'

export class BlockHandler {
  private logger: Logger
  private metrics: Metrics
  private readonly proxyWatchers: ProxyWatcher[]
  private WithdrawalsSrv: MonitorWithdrawals
  private bridgeBalanceSrv: BridgeBalanceSrv
  private healthChecker: HealthChecker
  private ethProvider: ETHProvider

  private onAppStartFindings: Finding[] = []

  constructor(
    logger: Logger,
    metrics: Metrics,
    proxyWatchers: ProxyWatcher[],
    WithdrawalsSrv: MonitorWithdrawals,
    bridgeBalanceSrv: BridgeBalanceSrv,
    healthChecker: HealthChecker,
    ethProvider: ETHProvider,
    onAppStartFindings: Finding[],
  ) {
    this.logger = logger
    this.metrics = metrics
    this.proxyWatchers = proxyWatchers
    this.WithdrawalsSrv = WithdrawalsSrv
    this.bridgeBalanceSrv = bridgeBalanceSrv
    this.healthChecker = healthChecker
    this.ethProvider = ethProvider
    this.onAppStartFindings = onAppStartFindings
  }

  public handleBlock() {
    return async (
      call: ServerUnaryCall<EvaluateBlockRequest, EvaluateBlockResponse>,
      callback: sendUnaryData<EvaluateBlockResponse>,
    ) => {
      this.metrics.lastAgentTouch.labels({ method: HandleBlockLabel }).set(new Date().getTime())
      const end = this.metrics.summaryHandlers.labels({ method: HandleBlockLabel }).startTimer()

      const event = <BlockEvent>call.request.getEvent()
      const block = <BlockEvent.EthBlock>event.getBlock()

      const l2blockDtoEvent: BlockDto = {
        number: new BigNumber(block.getNumber(), 10).toNumber(),
        timestamp: new BigNumber(block.getTimestamp(), 10).toNumber(),
        parentHash: block.getParenthash(),
        hash: block.getHash(),
      }

      const findings: Finding[] = []

      this.logger.info(`#Optimism block: ${l2blockDtoEvent.number}`)
      const startTime = new Date().getTime()

      if (this.onAppStartFindings.length > 0) {
        findings.push(...this.onAppStartFindings)
        this.onAppStartFindings = []
      }

      const l1BlockNumber = await this.ethProvider.getBlockNumber()
      if (E.isLeft(l1BlockNumber)) {
        this.logger.warn(`#ETH block skipped`)
        findings.push(
          networkAlert(
            l1BlockNumber.left,
            `Error in ${BlockHandler.name}.${this.ethProvider.getBlockNumber.name}:80`,
            `Could not call clientL1.getBlockNumber`,
          ),
        )
      }

      if (E.isRight(l1BlockNumber)) {
        this.logger.info(`#ETH block: ${l1BlockNumber.right}`)
        const bridgeBalanceFindings = await this.bridgeBalanceSrv.handleBlock(
          l1BlockNumber.right,
          l2blockDtoEvent.number,
        )
        findings.push(...bridgeBalanceFindings)
      }

      for (const proxyWatcher of this.proxyWatchers) {
        const fnds = await proxyWatcher.handleL2Block(l2blockDtoEvent.number)
        findings.push(...fnds)
      }

      const withdrawalsFindings = this.WithdrawalsSrv.handleL2Block(l2blockDtoEvent)
      findings.push(...withdrawalsFindings)

      const errCount = this.healthChecker.check(findings)
      errCount === 0
        ? this.metrics.processedIterations.labels({ method: HandleBlockLabel, status: StatusOK }).inc()
        : this.metrics.processedIterations.labels({ method: HandleBlockLabel, status: StatusFail }).inc()

      const blockResponse = new EvaluateBlockResponse()
      blockResponse.setStatus(ResponseStatus.SUCCESS)
      blockResponse.setPrivate(false)
      blockResponse.setFindingsList(findings)
      const m = blockResponse.getMetadataMap()
      m.set('timestamp', new Date().toISOString())

      this.logger.info(elapsedTime('handleBlock', startTime) + '\n')
      this.metrics.lastBlockNumber.set(l2blockDtoEvent.number)

      end()
      callback(null, blockResponse)
    }
  }
}
