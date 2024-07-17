import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { BlockEvent, EvaluateBlockRequest, EvaluateBlockResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { BlockDto } from '../entity/events'
import BigNumber from 'bignumber.js'
import { Finding } from '../generated/proto/alert_pb'
import { either as E } from 'fp-ts'
import { HandleBlockLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { ETHProvider } from '../clients/eth_provider'

const MINUTES_6 = 60 * 6

export class BlockHandler {
  private logger: Logger
  private metrics: Metrics
  private StethOperationSrv: StethOperationSrv
  private WithdrawalsSrv: WithdrawalsSrv
  private GateSealSrv: GateSealSrv
  private VaultSrv: VaultSrv
  private healthChecker: HealthChecker

  private onAppStartFindings: Finding[] = []
  private readonly ethProvider: ETHProvider

  constructor(
    logger: Logger,
    metrics: Metrics,
    StethOperationSrv: StethOperationSrv,
    WithdrawalsSrv: WithdrawalsSrv,
    GateSealSrv: GateSealSrv,
    VaultSrv: VaultSrv,
    healthChecker: HealthChecker,
    onAppStartFindings: Finding[],
    ethProvider: ETHProvider,
  ) {
    this.logger = logger
    this.metrics = metrics
    this.StethOperationSrv = StethOperationSrv
    this.WithdrawalsSrv = WithdrawalsSrv
    this.GateSealSrv = GateSealSrv
    this.VaultSrv = VaultSrv
    this.healthChecker = healthChecker
    this.onAppStartFindings = onAppStartFindings
    this.ethProvider = ethProvider
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

      const findings: Finding[] = []
      const latestL1Block = await this.ethProvider.getBlockByHash('latest')
      if (E.isRight(latestL1Block)) {
        const infraLine = `#ETH block infra: ${blockDtoEvent.number} ${blockDtoEvent.timestamp}\n`
        const lastBlockLine = `#ETH block latst: ${latestL1Block.right.number} ${latestL1Block.right.timestamp}. Diff: `
        const diff = latestL1Block.right.timestamp - blockDtoEvent.timestamp
        const diffLine = `${latestL1Block.right.timestamp} - ${blockDtoEvent.timestamp} = ${diff}`

        this.logger.info(`\n` + infraLine + lastBlockLine + diffLine)

        if (diff > MINUTES_6) {
          const f: Finding = new Finding()

          f.setName(`⚠️ Infra block is outdated`)
          f.setDescription(infraLine + lastBlockLine + diffLine)
          f.setAlertid('L1-BLOCK-OUTDATED')
          f.setSeverity(Finding.Severity.MEDIUM)
          f.setType(Finding.FindingType.SUSPICIOUS)
          f.setProtocol('ethereum')

          findings.push(f)
        }
      }

      const startTime = new Date().getTime()

      if (this.onAppStartFindings.length > 0) {
        findings.push(...this.onAppStartFindings)
        this.onAppStartFindings = []
      }

      const [bufferedEthFindings, withdrawalsFindings, gateSealFindings, vaultFindings] = await Promise.all([
        this.StethOperationSrv.handleBlock(blockDtoEvent),
        this.WithdrawalsSrv.handleBlock(blockDtoEvent),
        this.GateSealSrv.handleBlock(blockDtoEvent),
        this.VaultSrv.handleBlock(blockDtoEvent),
      ])

      const WithdrawalStat = await this.WithdrawalsSrv.getStatistic()
      const stat: string = E.isLeft(WithdrawalStat) ? WithdrawalStat.left.message : WithdrawalStat.right

      findings.push(...bufferedEthFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

      const errCount = this.healthChecker.check(findings)
      errCount === 0
        ? this.metrics.processedIterations.labels({ method: HandleBlockLabel, status: StatusOK }).inc()
        : this.metrics.processedIterations.labels({ method: HandleBlockLabel, status: StatusFail }).inc()

      this.logger.info(stat)

      const share = this.StethOperationSrv.getStorage().getShareRate()
      this.logger.info(`\tShare rate: ${share.amount.toFixed(4)} on block: ${share.blockNumber}`)

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
