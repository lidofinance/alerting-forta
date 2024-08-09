import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { BlockEvent, EvaluateBlockRequest, EvaluateBlockResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { CSModuleSrv } from '../services/CSModule/CSModule.srv'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { CSAccountingSrv } from '../services/CSAccounting/CSAccounting.srv'
import { CSFeeOracleSrv } from '../services/CSFeeOracle/CSFeeOracle.srv'
import { CSFeeDistributorSrv } from '../services/CSFeeDistributor/CSFeeDistributor.srv'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { BlockDto } from '../entity/events'
import BigNumber from 'bignumber.js'
import { Finding } from '../generated/proto/alert_pb'
import { HandleBlockLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'

export class BlockHandler {
  private logger: Logger
  private metrics: Metrics
  private csModuleSrv: CSModuleSrv
  private csAccountingSrv: CSAccountingSrv
  private csFeeDistributorSrv: CSFeeDistributorSrv
  private csFeeOracleSrv: CSFeeOracleSrv
  private healthChecker: HealthChecker

  private onAppStartFindings: Finding[] = []

  constructor(
    logger: Logger,
    metrics: Metrics,
    csModuleSrv: CSModuleSrv,
    csAccountingSrv: CSAccountingSrv,
    csFeeDistributorSrv: CSFeeDistributorSrv,
    csFeeOracleSrv: CSFeeOracleSrv,
    healthChecker: HealthChecker,
    onAppStartFindings: Finding[],
  ) {
    this.logger = logger
    this.metrics = metrics
    this.csModuleSrv = csModuleSrv
    this.csAccountingSrv = csAccountingSrv
    this.csFeeDistributorSrv = csFeeDistributorSrv
    this.csFeeOracleSrv = csFeeOracleSrv
    this.healthChecker = healthChecker
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

      const blockDtoEvent: BlockDto = {
        number: new BigNumber(block.getNumber(), 10).toNumber(),
        timestamp: new BigNumber(block.getTimestamp(), 10).toNumber(),
        parentHash: block.getParenthash(),
        hash: block.getHash(),
      }

      this.logger.info(`#ETH block: ${blockDtoEvent.number}`)
      const startTime = new Date().getTime()

      const findings: Finding[] = []
      if (this.onAppStartFindings.length > 0) {
        findings.push(...this.onAppStartFindings)
        this.onAppStartFindings = []
      }

      const [csModuleFindings, csAccountingFindings, csFeeDistributorFindings, csFeeOracleFindings] = await Promise.all(
        [
          this.csModuleSrv.handleBlock(blockDtoEvent),
          this.csAccountingSrv.handleBlock(blockDtoEvent),
          this.csFeeDistributorSrv.handleBlock(blockDtoEvent),
          this.csFeeOracleSrv.handleBlock(blockDtoEvent),
        ],
      )

      findings.push(...csModuleFindings, ...csAccountingFindings, ...csFeeDistributorFindings, ...csFeeOracleFindings)

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
      this.metrics.lastBlockNumber.set(blockDtoEvent.number)

      end()
      callback(null, blockResponse)
    }
  }
}
