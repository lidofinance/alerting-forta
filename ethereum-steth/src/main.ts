import * as grpc from '@grpc/grpc-js'
import { App } from './app'
import { BlockHandler } from './handlers/block.handler'
import process from 'process'
import { HealthHandler } from './handlers/health.handler'
import { TxHandler } from './handlers/tx.handler'
import { InitHandler } from './handlers/init.handler'
import { AlertHandler } from './handlers/alert.handler'
import { AgentService } from './generated/proto/agent_grpc_pb'
import express, { Express, Request, Response } from 'express'
import Version from './utils/version'
import { Finding } from './generated/proto/alert_pb'
import * as E from 'fp-ts/Either'

const main = async () => {
  const app = await App.getInstance()

  try {
    await app.db.migrate.latest()

    app.logger.info('Migrations have been run successfully.')
  } catch (error) {
    app.logger.error('Error running migrations:', error)
    process.exit(1)
  }

  const onAppFindings: Finding[] = []

  const gRPCserver = new grpc.Server()
  const blockH = new BlockHandler(
    app.logger,
    app.StethOperationSrv,
    app.WithdrawalsSrv,
    app.GateSealSrv,
    app.VaultSrv,
    app.healthChecker,
    onAppFindings,
  )
  const txH = new TxHandler(app.StethOperationSrv, app.WithdrawalsSrv, app.GateSealSrv, app.VaultSrv, app.healthChecker)
  const healthH = new HealthHandler(app.healthChecker, app.metrics)
  const initH = new InitHandler(
    app.ethClient,
    app.logger,
    app.StethOperationSrv,
    app.WithdrawalsSrv,
    app.GateSealSrv,
    app.VaultSrv,
    onAppFindings,
  )
  const alertH = new AlertHandler()

  gRPCserver.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    evaluateTx: txH.handleTx(),
    healthCheck: healthH.handleHealth(),
    // not used, but required for grpc contract
    evaluateAlert: alertH.handleAlert(),
  })

  const latestBlockNumber = await app.ethClient.getBlockNumber()
  if (E.isLeft(latestBlockNumber)) {
    app.logger.error(latestBlockNumber.left)

    process.exit(1)
  }

  const stethOperationSrvErr = await app.StethOperationSrv.initialize(latestBlockNumber.right)
  if (stethOperationSrvErr !== null) {
    app.logger.error('Could not init stethSrv', stethOperationSrvErr)

    process.exit(1)
  }

  const gateSealSrvErr = await app.GateSealSrv.initialize(latestBlockNumber.right)
  if (gateSealSrvErr instanceof Error) {
    app.logger.error('Could not init gateSealSrvErr', gateSealSrvErr)

    process.exit(1)
  } else {
    onAppFindings.push(...gateSealSrvErr)
  }

  const withdrawalsSrvErr = await app.WithdrawalsSrv.initialize(latestBlockNumber.right)
  if (withdrawalsSrvErr !== null) {
    app.logger.error('Could not init withdrawalsSrvErr', withdrawalsSrvErr)

    process.exit(1)
  }

  app.metrics.build().set({ commitHash: Version.commitHash }, 1)

  gRPCserver.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      app.logger.error(err)

      process.exit(1)
    }
    app.logger.info(`gRPC is listening on ${port}`)
  })

  const httpService: Express = express()
  const port = 3000

  httpService.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', app.prometheus.contentType)
    res.send(await app.prometheus.metrics())
  })

  httpService.get('/health', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify('ok'))
  })

  httpService.listen(port, () => {
    app.logger.info(`Http server is running at http://localhost:${port}`)
  })
}

main()
