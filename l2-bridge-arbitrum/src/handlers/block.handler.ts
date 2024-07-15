import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { BlockEvent, EvaluateBlockRequest, EvaluateBlockResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { Logger } from 'winston'
import { elapsedTime, isWorkInterval, SECONDS_60, SECONDS_768 } from '../utils/time'
import BigNumber from 'bignumber.js'
import { Finding } from '../generated/proto/alert_pb'
import { HandleL1BlockLabel, HandleL2BlockLabel, Metrics, StatusFail, StatusOK } from '../utils/metrics/metrics'
import { MonitorWithdrawals } from '../services/monitor_withdrawals'
import { BlockDto, BlockDtoWithTransactions } from '../entity/blockDto'
import { ProxyWatcher } from '../services/proxy_watcher'
import { BridgeBalanceSrv } from '../services/bridge_balance'
import * as E from 'fp-ts/Either'
import { networkAlert } from '../utils/errors'
import { ArbitrumClient } from '../clients/arbitrum_client'
import { ArrRW } from '../utils/mutex'
import { retryAsync } from 'ts-retry'
import { EventWatcher } from '../services/event_watcher'
import { ETHProvider } from '../clients/eth_provider_client'

const DELAY_IN_500MS = 500
const ATTEMPTS_5 = 5

export class BlockHandler {
  private arbProvider: ArbitrumClient
  private ethProvider: ETHProvider
  private logger: Logger
  private metrics: Metrics

  private readonly proxyWatchers: ProxyWatcher[]
  private WithdrawalsSrv: MonitorWithdrawals
  private bridgeBalanceSrv: BridgeBalanceSrv

  private bridgeWatcher: EventWatcher
  private govWatcher: EventWatcher
  private proxyWatcher: EventWatcher

  private healthChecker: HealthChecker
  private findings: ArrRW<Finding>

  private readonly launch: Date

  constructor(
    arbProvider: ArbitrumClient,
    ethProvider: ETHProvider,
    logger: Logger,
    metrics: Metrics,
    proxyWatchers: ProxyWatcher[],
    WithdrawalsSrv: MonitorWithdrawals,
    bridgeBalanceSrv: BridgeBalanceSrv,
    bridgeWatcher: EventWatcher,
    govWatcher: EventWatcher,
    proxyWatcher: EventWatcher,
    healthChecker: HealthChecker,
    findings: Finding[],
  ) {
    this.logger = logger
    this.metrics = metrics

    this.proxyWatchers = proxyWatchers
    this.WithdrawalsSrv = WithdrawalsSrv
    this.bridgeBalanceSrv = bridgeBalanceSrv

    this.bridgeWatcher = bridgeWatcher
    this.govWatcher = govWatcher
    this.proxyWatcher = proxyWatcher

    this.healthChecker = healthChecker
    this.arbProvider = arbProvider
    this.ethProvider = ethProvider
    this.findings = new ArrRW<Finding>(findings)

    this.launch = new Date()
  }

  public handleBlock() {
    return async (
      call: ServerUnaryCall<EvaluateBlockRequest, EvaluateBlockResponse>,
      callback: sendUnaryData<EvaluateBlockResponse>,
    ) => {
      this.metrics.lastAgentTouch.labels({ method: HandleL1BlockLabel }).set(new Date().getTime())
      const end = this.metrics.summaryHandlers.labels({ method: HandleL1BlockLabel }).startTimer()

      const event = <BlockEvent>call.request.getEvent()
      const block = <BlockEvent.EthBlock>event.getBlock()

      const findings: Finding[] = []
      const fnds = await this.findings.read()
      await this.findings.clear()

      const out = new EvaluateBlockResponse()
      if (fnds.length > 0) {
        findings.push(...fnds)

        const errCount = this.healthChecker.check(findings)
        errCount === 0
          ? this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusOK }).inc()
          : this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()

        out.setStatus(ResponseStatus.SUCCESS)
        out.setPrivate(false)
        out.setFindingsList(findings)
        const m = out.getMetadataMap()
        m.set('timestamp', new Date().toISOString())
      }

      const l1Block: BlockDto = {
        number: new BigNumber(block.getNumber(), 10).toNumber(),
        timestamp: new BigNumber(block.getTimestamp(), 10).toNumber(),
        parentHash: block.getParenthash(),
        hash: block.getHash(),
      }

      const latestL1Block = await this.ethProvider.getBlockByTag('latest')
      this.logger.info(`\n\n`)
      let startedMessage = `\tStarting handleBlock FromInfra(${l1Block.number}). Latest: Could not fetched`
      if (E.isRight(latestL1Block)) {
        startedMessage = `\tStarting handleBlock FromInfra(${l1Block.number}). Latest ${latestL1Block.right.number}`
      }
      this.logger.info(startedMessage)

      let latestL2Block = await this.arbProvider.getL2BlockByHash('latest')
      if (E.isLeft(latestL2Block)) {
        const networkErr = networkAlert(latestL2Block.left, `Could not handleBlock`, `could not fetch latest l2 block`)
        out.addFindings(networkErr)
        out.setStatus(ResponseStatus.ERROR)

        this.logger.error(`Could not handleBlock: ${latestL2Block.left.name}: ${latestL2Block.left.message}`)
        this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()
        end()

        callback(null, out)
        return
      }

      if (latestL2Block.right.timestamp - l1Block.timestamp > SECONDS_60) {
        latestL2Block = await this.findStartingL2BlockByBinarySearch(l1Block, latestL2Block.right)
        if (E.isLeft(latestL2Block)) {
          const networkErr = networkAlert(
            latestL2Block.left,
            `Could not handleBlock`,
            `could not findStartingL2BlockByBinarySearch l2 block`,
          )
          out.addFindings(networkErr)
          out.setStatus(ResponseStatus.ERROR)

          this.logger.error(`Could not get starting l2block: ${latestL2Block.left}`)
          this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()
          end()

          callback(null, out)
          return
        }
      } else if (latestL2Block.right.timestamp - l1Block.timestamp < -SECONDS_768) {
        callback(null, out)
        return
      }

      const startTime = new Date().getTime()
      this.asyncProcess(l1Block, latestL2Block.right).then((blocks) => {
        if (blocks.length > 0) {
          const firstL2 = blocks[0]
          const lastL2 = blocks[blocks.length - 1]
          this.logger.info(
            `\n` +
              `#ETH block:     ${l1Block.number} at ${new Date(l1Block.timestamp * 1000).toUTCString()}. ${l1Block.timestamp} \n` +
              `#ARB block src: ${firstL2.number} at ${new Date(firstL2.timestamp * 1000).toUTCString()}. ${firstL2.timestamp} \n` +
              `#ARB block dst: ${lastL2.number} at ${new Date(lastL2.timestamp * 1000).toUTCString()}. ${lastL2.timestamp} Total: ${blocks.length}`,
          )
        } else {
          this.logger.info(
            `\n` +
              `#ETH block: ${l1Block.number} #ARB block dst: ${latestL2Block.right.number} \n` +
              `#ETH block: ${new Date(l1Block.timestamp * 1000).toUTCString()}. ${l1Block.timestamp} \n` +
              `#ARB block src: ${new Date((l1Block.timestamp - SECONDS_768) * 1000).toUTCString()}. ${latestL2Block.right.timestamp - SECONDS_768} \n` +
              `#ARB real: ${new Date(latestL2Block.right.timestamp * 1000).toUTCString()}. ${latestL2Block.right.timestamp} \n` +
              `#ARB block dst: ${new Date((l1Block.timestamp + SECONDS_60) * 1000).toUTCString()}. ${latestL2Block.right.timestamp + SECONDS_60}`,
          )
        }

        this.logger.info(elapsedTime(`\tFinish: handleBlock(${l1Block.number})`, startTime))
        this.metrics.lastBlockNumber.set(l1Block.number)
        this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusOK }).inc()
        this.metrics.processedIterations.labels({ method: HandleL2BlockLabel, status: StatusOK }).inc(blocks.length)

        end()
      })

      callback(null, out)
    }
  }

  public async asyncProcess(
    l1Block: BlockDto,
    latestL2Block: BlockDtoWithTransactions,
  ): Promise<BlockDtoWithTransactions[]> {
    const blocks: BlockDtoWithTransactions[] = []
    if (isWorkInterval(l1Block.timestamp, latestL2Block.timestamp)) {
      blocks.push(latestL2Block)
    }

    let blockTag = latestL2Block.parentHash
    let l2BlockTimestamp = latestL2Block.timestamp

    while (isWorkInterval(l1Block.timestamp, l2BlockTimestamp)) {
      try {
        const l2block = await retryAsync<BlockDtoWithTransactions>(
          async (): Promise<BlockDtoWithTransactions> => {
            const l2block = await this.arbProvider.getL2BlockByHash(blockTag)
            this.arbProvider.getL2BlockByHash('latest')

            if (E.isLeft(l2block)) {
              throw l2block.left
            }

            return l2block.right
          },
          { delay: DELAY_IN_500MS, maxTry: ATTEMPTS_5 },
        )

        // If, after starting the application,
        // we reach an interval where L2 is in the past relative to L1, (L2 < L1)
        // then finish the work and collect the cache!
        if (Math.round(+new Date() / 1000) - Math.round(+this.launch / 1000) < SECONDS_768) {
          if (l2block.timestamp - l1Block.timestamp <= -1) {
            break
          }
        }

        // If the L2 block is older than the L1 block by 12.8, then finish the work
        if (l2block.timestamp - l1Block.timestamp < -SECONDS_768) {
          break
        }

        if (isWorkInterval(l1Block.timestamp, l2block.timestamp)) {
          blocks.unshift(l2block)
          this.logger.info('\n')
          this.logger.info(
            `#ETH block:      ${l1Block.number} at ${new Date(l1Block.timestamp * 1000).toUTCString()}. ${l1Block.timestamp}`,
          )
          this.logger.info(
            `#ARB block src: ${l2block.number} at ${new Date(l2block.timestamp * 1000).toUTCString()}. ${l2block.timestamp} `,
          )

          this.bridgeBalanceSrv.handleBlock(l1Block, l2block).then((findings) => {
            if (findings.length > 0) {
              this.findings.write(findings)
            }
          })

          for (const proxyWatcher of this.proxyWatchers) {
            proxyWatcher.handleL2Block(l2block).then((findings) => {
              if (findings.length > 0) {
                this.findings.write(findings)
              }
            })
          }
        }

        l2BlockTimestamp = l2block.timestamp
        blockTag = l2block.parentHash
      } catch (e) {
        this.logger.warn(`Could not call arbProvider.getL2BlockByHash ${e}`)
      }
    }

    const transactions = []
    const startWithdrawalsSrv = new Date().getTime()
    for (const l2Block of blocks) {
      for (const trx of l2Block.transactions) {
        transactions.push(trx)
        this.WithdrawalsSrv.handleTransaction(trx)

        const bridgeFindings = this.bridgeWatcher.handleL2Logs(trx.logs)
        const govFindings = this.govWatcher.handleL2Logs(trx.logs)
        const proxyFindings = this.proxyWatcher.handleL2Logs(trx.logs)

        const findings = [...bridgeFindings, ...govFindings, ...proxyFindings]
        if (findings.length > 0) {
          await this.findings.write(findings)
        }
      }
      const withdrawalFindings = this.WithdrawalsSrv.handleL2Block(l2Block)
      if (withdrawalFindings.length > 0) {
        await this.findings.write(withdrawalFindings)
      }
    }

    this.logger.info(
      elapsedTime(this.WithdrawalsSrv.getName() + '.' + this.WithdrawalsSrv.handleL2Block.name, startWithdrawalsSrv),
    )

    return blocks
  }

  public async findStartingL2BlockByBinarySearch(
    l1Block: BlockDto,
    l2block: BlockDto,
  ): Promise<E.Either<Error, BlockDtoWithTransactions>> {
    let target: number = 0
    let left: number = 0
    let right: number = 0

    if (l1Block.timestamp === l2block.timestamp) {
      return await this.arbProvider.getL2BlockByHash(l2block.hash)
    }

    if (l2block.timestamp > l1Block.timestamp) {
      left = l1Block.timestamp
      right = l1Block.timestamp + SECONDS_60
      target = right
    }

    if (l2block.timestamp < l1Block.timestamp) {
      left = l1Block.timestamp - SECONDS_768
      right = l1Block.timestamp
      target = left
    }

    const resp = await this.arbProvider.search(left, right, target, l2block)
    if (E.isLeft(resp)) {
      return E.left(resp.left)
    }

    return await this.arbProvider.getL2BlockByHash(resp.right.hash)
  }
}
