import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { BlockEvent, EvaluateBlockRequest, EvaluateBlockResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { Logger } from 'winston'
import { elapsed } from '../utils/time'
import BigNumber from 'bignumber.js'
import { Finding } from '../generated/proto/alert_pb'
import { HandleL1BlockLabel, HandleL2BlockLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { ProxyWatcher } from '../services/proxy_watcher'
import { BridgeBalanceSrv } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../utils/errors'
import { EventWatcher } from '../services/event_watcher'
import { ETHProvider } from '../clients/eth_provider_client'
import { L2BlocksSrv } from '../services/l2_blocks/L2Blocks.srv'
import { BlockDto } from '../entity/l2block'
import { WithdrawalSrv } from '../services/monitor_withdrawals'

const MINUTES_6 = 60 * 6

export class BlockHandler {
  private ethProvider: ETHProvider
  private logger: Logger
  private metrics: Metrics
  private readonly l2BlocksSrv: L2BlocksSrv

  private readonly l1ProxyWatcher: ProxyWatcher
  private readonly l2ProxyWatchers: ProxyWatcher[]
  private withdrawalsSrv: WithdrawalSrv
  private bridgeBalanceSrv: BridgeBalanceSrv

  private l2EventWatcher: EventWatcher

  private healthChecker: HealthChecker
  private onAppStartFindings: Finding[]
  private readonly networkName: string

  constructor(
    ethProvider: ETHProvider,
    logger: Logger,
    metrics: Metrics,
    l1ProxyWatcher: ProxyWatcher,
    l2ProxyWatchers: ProxyWatcher[],
    WithdrawalsSrv: WithdrawalSrv,
    bridgeBalanceSrv: BridgeBalanceSrv,
    eventL2Watcher: EventWatcher,
    healthChecker: HealthChecker,
    onAppStartFindings: Finding[],
    l2BlocksSrv: L2BlocksSrv,
    networkName: string,
  ) {
    this.ethProvider = ethProvider
    this.logger = logger
    this.metrics = metrics
    this.l2BlocksSrv = l2BlocksSrv

    this.l1ProxyWatcher = l1ProxyWatcher
    this.l2ProxyWatchers = l2ProxyWatchers
    this.withdrawalsSrv = WithdrawalsSrv
    this.bridgeBalanceSrv = bridgeBalanceSrv

    this.l2EventWatcher = eventL2Watcher

    this.healthChecker = healthChecker
    this.onAppStartFindings = onAppStartFindings
    this.networkName = networkName
  }

  public handleBlock() {
    return async (
      call: ServerUnaryCall<EvaluateBlockRequest, EvaluateBlockResponse>,
      callback: sendUnaryData<EvaluateBlockResponse>,
    ) => {
      const startTime = new Date()
      this.metrics.lastAgentTouch.labels({ method: HandleL1BlockLabel }).set(startTime.getTime())
      const end = this.metrics.summaryHandlers.labels({ method: HandleL1BlockLabel }).startTimer()

      const event = <BlockEvent>call.request.getEvent()
      const block = <BlockEvent.EthBlock>event.getBlock()
      const out = new EvaluateBlockResponse()

      const l1Block = new BlockDto(
        block.getHash(),
        block.getParenthash(),
        new BigNumber(block.getNumber(), 10).toNumber(),
        new BigNumber(block.getTimestamp(), 10).toNumber(),
      )

      const findings: Finding[] = []
      const latestL1Block = await this.ethProvider.getBlockByTag('latest')
      let startedMessage = `Handle block(${l1Block.number}). Latest: Could not fetched`
      if (E.isRight(latestL1Block)) {
        const infraLine = `#ETH block infra: ${l1Block.number} ${l1Block.timestamp}\n`
        const lastBlockLine = `#ETH block latst: ${latestL1Block.right.number} ${latestL1Block.right.timestamp}. Delay between blocks: `
        const diff = latestL1Block.right.timestamp - l1Block.timestamp
        const diffLine = `${latestL1Block.right.timestamp} - ${l1Block.timestamp} = ${diff} seconds`

        startedMessage = `\n` + infraLine + lastBlockLine + diffLine

        if (diff > MINUTES_6) {
          const f: Finding = new Finding()

          f.setName(`⚠️ Currently processing Ethereum network block is outdated`)
          f.setDescription(infraLine + lastBlockLine + diffLine)
          f.setAlertid('L1-BLOCK-OUTDATED')
          f.setSeverity(Finding.Severity.MEDIUM)
          f.setType(Finding.FindingType.SUSPICIOUS)
          f.setProtocol('ethereum')

          findings.push(f)
        }
      }

      this.logger.info(startedMessage)

      const store = await this.l2BlocksSrv.updGetL2blocksStore(l1Block)
      if (E.isLeft(store)) {
        const networkErr = networkAlert(store.left, `Could not update l2 blocks store`, store.left.message)
        out.addFindings(networkErr)
        out.setStatus(ResponseStatus.ERROR)

        this.logger.error(`Could not handleBlock: ${store.left.message}`)
        this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()
        end()

        callback(null, out)
        return
      }

      if (this.onAppStartFindings.length > 0) {
        findings.push(...this.onAppStartFindings)
        this.onAppStartFindings = []
      }

      const l2EventFindings = this.l2EventWatcher.handleLogs(store.right.l2Logs)
      const balancesFindings = await this.bridgeBalanceSrv.handleBlock(l1Block, store.right.l2Blocks)
      findings.push(...balancesFindings, ...l2EventFindings)

      const l2Blocks = await this.l2BlocksSrv.getL2BlocksFrom(store.right.prevLatestL2Block)
      if (E.isLeft(l2Blocks)) {
        const msg = `Could not fetch l2 blocks from store from proxyWatcher`
        this.logger.error(`${msg}: ${l2Blocks.left.message}`)
        const networkErr = networkAlert(l2Blocks.left, msg, l2Blocks.left.message)
        findings.push(networkErr)
      }
      if (E.isRight(l2Blocks) && l2Blocks.right.length > 0) {
        const promises = []
        for (const proxyWatcher of this.l2ProxyWatchers) {
          promises.push(proxyWatcher.handleBlocks(store.right.l2Blocks))
        }

        const startProxyWatcher = new Date().getTime()
        this.logger.info(
          `\tL2 Proxy watcher started: ${new Date(startProxyWatcher).toUTCString()}. L2Blocks: ${l2Blocks.right.length}`,
        )
        const proxyWatcherFindings = (await Promise.all(promises)).flat()
        this.logger.info(`\tL2 Proxy watcher finished. Duration: ${elapsed(startProxyWatcher)}\n`)
        findings.push(...proxyWatcherFindings)

        const withdrawalFindings = await this.withdrawalsSrv.toMonitor(store.right.l2Logs, l2Blocks.right)
        findings.push(...withdrawalFindings)
      }

      const startProxyWatcher = new Date().getTime()
      this.logger.info(
        `\n\tL1 Proxy watcher started: ${new Date(startProxyWatcher).toUTCString()}. L1Block: ${l1Block.number}`,
      )
      const l1ProxyFindings = await this.l1ProxyWatcher.handleBlocks([l1Block])
      this.logger.info(`\tL1 Proxy watcher finished. Duration: ${elapsed(startProxyWatcher)}\n`)
      findings.push(...l1ProxyFindings)

      const handleBlock = `Finish: handleBlock(${l1Block.number}). L2 blocks:`
      const duration = `Duration: ${elapsed(startTime.getTime())}\n`
      if (E.isRight(l2Blocks) && l2Blocks.right.length > 0) {
        this.logger.info(
          `${handleBlock} ${l2Blocks.right[0].number} - ${l2Blocks.right[l2Blocks.right.length - 1].number} Cnt(${l2Blocks.right.length}). ${duration}`,
        )
        this.metrics.processedIterations
          .labels({ method: HandleL2BlockLabel, status: StatusOK })
          .inc(l2Blocks.right.length)
      } else {
        this.logger.info(`${handleBlock} 0. ${duration}`)
        this.metrics.processedIterations.labels({ method: HandleL2BlockLabel, status: StatusFail }).inc()
      }

      const errCount = this.healthChecker.check(findings)
      errCount === 0
        ? this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusOK }).inc()
        : this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()

      this.metrics.lastBlockNumber.set(l1Block.number)

      out.setStatus(ResponseStatus.SUCCESS)
      out.setPrivate(false)
      out.setFindingsList(findings)

      callback(null, out)
    }
  }
}
