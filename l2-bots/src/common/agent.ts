import { ethers, /*BlockEvent,*/ } from 'forta-agent'
import { strict as assert } from 'node:assert'
import express, { Express, Request, Response } from 'express'
import * as process from 'process'
import * as grpc from '@grpc/grpc-js'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'

// import { InitializeResponse } from 'forta-agent/dist/sdk/initialize.response'
import { Metrics, createMetrics, HandleL1BlockLabel, HandleL2BlockLabel, HandleTxLabel, StatusOK, StatusFail } from './utils/metrics/metrics'
import * as E from 'fp-ts/Either'
import { JsonRpcProvider } from '@ethersproject/providers'
import { knex } from 'knex'
import BigNumber from 'bignumber.js'
import * as Winston from 'winston'
import { Logger } from 'winston'
import { BlockDto } from './entity/blockDto'
import { L2BlocksRepo } from './services/L2Blocks.repo'
import { L2BlocksSrv } from './services/L2Blocks.srv'
import { networkAlert } from './utils/error'
import { newTransactionDto } from './entity/events'

import { InitializeRequest, InitializeResponse, ResponseStatus, EvaluateBlockRequest, EvaluateBlockResponse, BlockEvent, EvaluateTxRequest, EvaluateTxResponse } from './generated/proto/agent_pb'

import { Finding } from './generated/proto/alert_pb'
import { AgentService } from './generated/proto/agent_grpc_pb'

import { elapsedTime, elapsed } from './utils/time'
import { L2Client } from './clients/l2_client'
import { EventWatcher } from './services/event_watcher_universal'
import { ERC20Short__factory } from './generated'
// import { MonitorWithdrawals } from './services/monitor_withdrawals'
import { ETHProvider } from './clients/eth_provider_client'
// import { BridgeBalanceSrv } from './services/bridge_balance'
import { Constants, L1_WSTETH_ADDRESS, getKnexConfig } from './constants'
import { getEventBasedAlerts } from './alert-bundles'

const MINUTES_6 = 60 * 6


export class Agent {
  public params: Constants
  public l1Provider: JsonRpcProvider
  public l2Provider: JsonRpcProvider
  public logger: Logger
  public l1Client: ETHProvider
  public l2Client: L2Client
  public l2BlocksSrv: L2BlocksSrv
  public l2EventWatcher: EventWatcher
  public initializeFindings: Finding[]
  public dbClient: knex.Knex
  public metrics: Metrics

  public constructor(params: Constants, metrics: Metrics) {
    this.params = params
    this.initializeFindings = []

    this.dbClient = knex(getKnexConfig())
    this.logger = Winston.createLogger({
      format: params.logFormat === 'simple' ? Winston.format.simple() : Winston.format.json(),
      transports: [new Winston.transports.Console()],
    })
    this.metrics = metrics

    this.l2Provider = new ethers.providers.JsonRpcProvider(params.L2_NETWORK_RPC, params.L2_NETWORK_ID)
    const bridgedWstethRunner = ERC20Short__factory.connect(params.L2_WSTETH_BRIDGED.address, this.l2Provider)

    this.l1Provider = new ethers.providers.JsonRpcProvider(params.l1RpcUrl)

    const wstethRunner = ERC20Short__factory.connect(L1_WSTETH_ADDRESS, this.l1Provider)
    this.l1Client = new ETHProvider(this.logger, this.metrics, wstethRunner, this.l1Provider)

    const eventAlertsToWatch = getEventBasedAlerts(params.L2_NAME)
    this.l2EventWatcher = new EventWatcher(eventAlertsToWatch, this.logger)

    this.l2Client = new L2Client(this.l2Provider, this.metrics, this.logger, bridgedWstethRunner, params.MAX_BLOCKS_PER_RPC_GET_LOGS_REQUEST)
    const L2BlockRepo = new L2BlocksRepo(this.dbClient)

    assert(String(params.govExecutor) === params.govExecutor)
    this.l2BlocksSrv = new L2BlocksSrv(this.l2Client, L2BlockRepo)
    // TODO
    // this.l2BlocksSrv = new L2BlocksSrv(this.l2Client, L2BlockRepo, [
    //   params.govExecutor as unknown as string, // TODO: it might be TransparentProxyInfo
    //   params.L2_ERC20_TOKEN_GATEWAY.address,
    //   params.L2_WSTETH_BRIDGED.address,
    // ])

  }

  public async initialize() {
    try {
      await this.dbClient.migrate.latest()
      this.logger.info('Migrations have been run successfully.')
    } catch (error) {
      this.logger.error('Error running migrations:', error)
      process.exit(1)
    }

    const f = new Finding()
    f.setName(`Bot on ${this.params.L2_NAME} launched`)
    // f.setDescription(`Version: ${Version.desc}`)
    f.setAlertid('LIDO-AGENT-LAUNCHED')
    f.setSeverity(Finding.Severity.INFO)
    f.setType(Finding.FindingType.INFORMATION)
    f.setProtocol('ethereum')
    this.initializeFindings.push(f)

    const [latestL1Block, latestL2Block] = await Promise.all([
      this.l1Client.getBlockByTag('latest'),
      this.l2Client.getLatestL2Block(),
    ])

    if (E.isLeft(latestL1Block)) {
      this.logger.error(`Could not init. handleInit: ${latestL1Block.left.message}`)
      return
    }
    if (E.isLeft(latestL2Block)) {
      this.logger.error(`Could not init. handleInit: ${latestL2Block.left.message}`)
      return
    }
  }

  public async handleBlock(blockEvent: BlockEvent): Promise<Finding[]> {
    const startTime = new Date()
    this.metrics.lastAgentTouch.labels({ method: HandleL1BlockLabel }).set(startTime.getTime())
    const end = this.metrics.summaryHandlers.labels({ method: HandleL1BlockLabel }).startTimer()

    const block = <BlockEvent.EthBlock>blockEvent.getBlock()
    const l1Block = new BlockDto(
      block.getHash(),
      block.getParenthash(),
      new BigNumber(block.getNumber(), 10).toNumber(),
      new BigNumber(block.getTimestamp(), 10).toNumber(),
    )

    const findings: Finding[] = []
    const latestL1Block = await this.l1Client.getBlockByTag('latest')
    let startedMessage = `Handle block(${l1Block.number}). Latest: Could not fetched`
    if (E.isRight(latestL1Block)) {
      const infraLine = `#ETH block infra: ${l1Block.number} ${l1Block.timestamp}\n`
      const lastBlockLine = `#ETH block last: ${latestL1Block.right.number} ${latestL1Block.right.timestamp}. Delay between blocks: `
      const diff = latestL1Block.right.timestamp - l1Block.timestamp
      const diffLine = `${latestL1Block.right.timestamp} - ${l1Block.timestamp} = ${diff} seconds`

      startedMessage = `\n` + infraLine + lastBlockLine + diffLine

      if (diff > MINUTES_6) {
        const f = new Finding()

        f.setName(`⚠️ Currently processing Ethereum network block is outdated`)
        f.setDescription(infraLine + lastBlockLine + diffLine)
        f.setAlertid('L1-BLOCK-OUTDATED')
        f.setSeverity(Finding.Severity.MEDIUM)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')

        findings.push(f)
      }

      this.logger.info(startedMessage)

      const store = await this.l2BlocksSrv.updGetL2BlocksStore(l1Block)
      if (E.isLeft(store)) {
        const networkErr = networkAlert(store.left, `Could not update l2 blocks store`, store.left.message)
        // out.addFindings(networkErr)
        // out.setStatus(ResponseStatus.ERROR)
        findings.push(networkErr)

        this.logger.error(`Could not handleBlock: ${store.left.message}`)
        this.metrics.processedIterations.labels({ method: HandleL1BlockLabel, status: StatusFail }).inc()
        end()

        // callback(null, out)
        return findings
      }

      if (this.initializeFindings.length > 0) {
        findings.push(...this.initializeFindings)
        this.initializeFindings = []
      }

      const l2EventFindings = this.l2EventWatcher.handleLogs(store.right.l2Logs)
      // const balancesFindings = await this.bridgeBalanceSrv.handleBlock(l1Block, store.right.l2Blocks)
      findings.push(/*...balancesFindings,*/ ...l2EventFindings)

      const l2Blocks = await this.l2BlocksSrv.getL2BlocksFrom(store.right.prevLatestL2Block)
      if (E.isLeft(l2Blocks)) {
        const msg = `Could not fetch l2 blocks from store from proxyWatcher`
        this.logger.error(`${msg}: ${l2Blocks.left.message}`)
        const networkErr = networkAlert(l2Blocks.left, msg, l2Blocks.left.message)
        findings.push(networkErr)
      }

      const handleBlock = `Finish: handleBlock(${l1Block.number}). L2 blocks:`
      const duration = `Duration: ${elapsed(startTime.getTime())}\n`
      if (E.isRight(l2Blocks) && l2Blocks.right.length > 0) {
        this.logger.info(
          `${handleBlock} ${l2Blocks.right[0].number} - ${l2Blocks.right[l2Blocks.right.length - 1].number} Cnt(${l2Blocks.right.length}). ${duration}`,
        )
        this.metrics.processedIterations
          .labels({ method: HandleL2BlockLabel, status: StatusOK })
          .inc(l2Blocks.right.length)
        end()
      } else {
        this.logger.info(`${handleBlock} 0. ${duration}`)
        this.metrics.processedIterations.labels({ method: HandleL2BlockLabel, status: StatusFail }).inc()
        end()
      }
    }

    this.logger.info(startedMessage)

    return findings
  }

  public async close() {
    this.dbClient.destroy()
  }
}



function getInitializeHandler(app: Agent) {
    return async (
      call: ServerUnaryCall<InitializeRequest, InitializeResponse>,
      callback: sendUnaryData<InitializeResponse>,
    ) => {
      const resp = new InitializeResponse()
      await app.initialize()
      resp.setStatus(ResponseStatus.SUCCESS)
      callback(null, resp)
  }
}

function getHandleBlockHandler(app: Agent) {
    return async (
      call: ServerUnaryCall<EvaluateBlockRequest, EvaluateBlockResponse>,
      callback: sendUnaryData<EvaluateBlockResponse>,
    ) => {
      const out = new EvaluateBlockResponse()

      const blockEvent = <BlockEvent>call.request.getEvent()
      const findings = await app.handleBlock(blockEvent)

      out.setStatus(ResponseStatus.SUCCESS)
      out.setPrivate(false)
      out.setFindingsList(findings)

      callback(null, out)
    }
}

function getHandleTxHandler(app: Agent) {
  return async (
    call: ServerUnaryCall<EvaluateTxRequest, EvaluateTxResponse>,
    callback: sendUnaryData<EvaluateTxResponse>,
  ) => {
    const txEvent = newTransactionDto(call.request)

    const findings: Finding[] = [] // await app.handleTx(txEvent)
    assert(false)


    const txResponse = new EvaluateTxResponse()
    txResponse.setStatus(ResponseStatus.SUCCESS)
    txResponse.setPrivate(false)
    txResponse.setFindingsList(findings)
    const m = txResponse.getMetadataMap()
    m.set('timestamp', new Date().toISOString())
    callback(null, txResponse)
  }
}


export const commonMain = async (params: Constants) => {
  console.debug(`RUN: commonMain`)
  const metrics = createMetrics(params)
  const app = new Agent(params, metrics)

  const grpcServer = new grpc.Server()

  grpcServer.addService(AgentService, {
    initialize: getInitializeHandler(app),
    evaluateBlock: getHandleBlockHandler(app),
    // evaluateTx: txH.handleTx(),

    // not used, but required for grpc contract
    // evaluateAlert: alertH.handleAlert(),
  })

  grpcServer.bindAsync(`0.0.0.0:${params.grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      app.logger.error(err)

      process.exit(1)
    }
    app.logger.info(`${params.L2_NAME} bot is listening on ${port}`)
  })

  const httpService: Express = express()
  httpService.get('/metrics', async (_: Request, res: Response) => {
    res.set('Content-Type', app.metrics.registry.contentType)
    res.send(await app.metrics.registry.metrics())
  })
  httpService.listen(params.httpPort, () => {
    app.logger.info(`Http server is running at http://localhost:${params.httpPort}`)
  })
}
