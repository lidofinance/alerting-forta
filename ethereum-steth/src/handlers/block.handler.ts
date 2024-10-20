import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import BigNumber from 'bignumber.js'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { ETHProvider } from '../clients/eth_provider'
import { BlockDto } from '../entity/events'
import { BlockEvent, EvaluateBlockRequest, EvaluateBlockResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { Finding } from '../generated/proto/alert_pb'
import { AaveSrv } from '../services/aave/Aave.srv'
import { GateSealSrv } from '../services/gate-seal/GateSeal.srv'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { PoolBalanceSrv } from '../services/pools-balances/pool-balance.srv'
import { StethOperationSrv } from '../services/steth_operation/StethOperation.srv'
import { StorageWatcherSrv } from '../services/storage-watcher/StorageWatcher.srv'
import { VaultSrv } from '../services/vault/Vault.srv'
import { WithdrawalsSrv } from '../services/withdrawals/Withdrawals.srv'
import { BotOutdatedAlertID } from '../utils/errors'
import { HandleBlockLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { elapsedTime } from '../utils/time'

const MINUTES_6 = 60 * 6

export class BlockHandler {
  private logger: Logger
  private metrics: Metrics
  private stethOperationSrv: StethOperationSrv
  private withdrawalsSrv: WithdrawalsSrv
  private gateSealSrv: GateSealSrv
  private VaultSrv: VaultSrv
  private storageWatcher: StorageWatcherSrv
  private aaveSrv: AaveSrv
  private poolBalanceSrv: PoolBalanceSrv
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
    storageWatcher: StorageWatcherSrv,
    aaveSrv: AaveSrv,
    poolBalanceSrv: PoolBalanceSrv,
    healthChecker: HealthChecker,
    onAppStartFindings: Finding[],
    ethProvider: ETHProvider,
  ) {
    this.logger = logger
    this.metrics = metrics
    this.stethOperationSrv = StethOperationSrv
    this.withdrawalsSrv = WithdrawalsSrv
    this.gateSealSrv = GateSealSrv
    this.VaultSrv = VaultSrv
    this.storageWatcher = storageWatcher
    this.aaveSrv = aaveSrv
    this.poolBalanceSrv = poolBalanceSrv
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
        const lastBlockLine = `#ETH block latst: ${latestL1Block.right.number} ${latestL1Block.right.timestamp}. Delay between blocks: `
        const diff = latestL1Block.right.timestamp - blockDtoEvent.timestamp
        const diffLine = `${latestL1Block.right.timestamp} - ${blockDtoEvent.timestamp} = ${diff} seconds`

        this.logger.info(`\n` + infraLine + lastBlockLine + diffLine)

        if (diff > MINUTES_6) {
          const f: Finding = new Finding()

          f.setName(`ℹ️ Steth: Currently processing Ethereum network block is outdated`)
          f.setDescription(infraLine + lastBlockLine + diffLine)
          f.setAlertid(BotOutdatedAlertID)
          f.setSeverity(Finding.Severity.INFO)
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

      const [bufferedEthFindings, withdrawalsFindings, gateSealFindings, vaultFindings, storageWatcherFindings] =
        await Promise.all([
          this.stethOperationSrv.handleBlock(blockDtoEvent),
          this.withdrawalsSrv.handleBlock(blockDtoEvent),
          this.gateSealSrv.handleBlock(blockDtoEvent),
          this.VaultSrv.handleBlock(blockDtoEvent),
          this.storageWatcher.handleBlock(blockDtoEvent),
          this.aaveSrv.handleBlock(blockDtoEvent),
          this.poolBalanceSrv.handleBlock(blockDtoEvent),
        ])

      const WithdrawalStat = await this.withdrawalsSrv.getStatisticString()
      const stat: string = E.isLeft(WithdrawalStat) ? WithdrawalStat.left.message : WithdrawalStat.right

      findings.push(
        ...bufferedEthFindings,
        ...withdrawalsFindings,
        ...gateSealFindings,
        ...vaultFindings,
        ...storageWatcherFindings,
      )

      const errCount = this.healthChecker.check(findings)
      errCount === 0
        ? this.metrics.processedIterations.labels({ method: HandleBlockLabel, status: StatusOK }).inc()
        : this.metrics.processedIterations.labels({ method: HandleBlockLabel, status: StatusFail }).inc()

      this.logger.info(stat)

      const share = this.stethOperationSrv.getStorage().getShareRate()
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
