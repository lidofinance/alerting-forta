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
import * as E from 'fp-ts/Either'
import { ETH_DECIMALS } from '../utils/constants'

export class BlockHandler {
  private logger: Logger
  private StethOperationSrv: StethOperationSrv
  private WithdrawalsSrv: WithdrawalsSrv
  private GateSealSrv: GateSealSrv
  private VaultSrv: VaultSrv
  private healthChecker: HealthChecker

  private onAppStartFindings: Finding[] = []

  constructor(
    logger: Logger,
    StethOperationSrv: StethOperationSrv,
    WithdrawalsSrv: WithdrawalsSrv,
    GateSealSrv: GateSealSrv,
    VaultSrv: VaultSrv,
    healthChecker: HealthChecker,
    onAppStartFindings: Finding[],
  ) {
    this.logger = logger
    this.StethOperationSrv = StethOperationSrv
    this.WithdrawalsSrv = WithdrawalsSrv
    this.GateSealSrv = GateSealSrv
    this.VaultSrv = VaultSrv
    this.healthChecker = healthChecker
    this.onAppStartFindings = onAppStartFindings
  }

  public handleBlock() {
    return async (
      call: ServerUnaryCall<EvaluateBlockRequest, EvaluateBlockResponse>,
      callback: sendUnaryData<EvaluateBlockResponse>,
    ) => {
      const event = <BlockEvent>call.request.getEvent()
      const block = <BlockEvent.EthBlock>event.getBlock()

      const blockDtoEvent: BlockDto = {
        number: new BigNumber(block.getNumber(), 10).toNumber(),
        timestamp: new BigNumber(block.getTimestamp(), 10).toNumber(),
        parentHash: block.getParenthash(),
      }

      this.logger.info(`#ETH block: ${blockDtoEvent.number}`)
      const startTime = new Date().getTime()

      const findings: Finding[] = []
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

      if (blockDtoEvent.number % 5 === 0) {
        const f: Finding = new Finding()
        f.setName(`DevOps findings`)
        f.setDescription(`Some text for description`)
        f.setAlertid('LIDO-DevOPS-ID')
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.INFORMATION)
        f.setProtocol('ethereum')

        findings.push(f)
      }

      findings.push(...bufferedEthFindings, ...withdrawalsFindings, ...gateSealFindings, ...vaultFindings)

      this.healthChecker.check(findings)
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
      callback(null, blockResponse)
    }
  }
}
