import * as grpc from '@grpc/grpc-js'
import { App } from './app'
import { BlockHandler } from './handlers/block.handler'
import process from 'process'
import { Finding } from 'forta-agent'
import { HealthHandler } from './handlers/health.handler'
import { TxHandler } from './handlers/tx.handler'
import { InitHandler } from './handlers/init.handler'
import { AlertHandler } from './handlers/alert.handler'
import { AgentService } from './proto/agent_grpc_pb'

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

  const server = new grpc.Server()
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
  const healthH = new HealthHandler(app.healthChecker)
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

  server.addService(AgentService, {
    initialize: initH.handleInit(),
    evaluateBlock: blockH.handleBlock(),
    evaluateTx: txH.handleTx(),
    healthCheck: healthH.handleHealth(),
    // not used, but required for grpc contract
    evaluateAlert: alertH.handleAlert(),
  })

  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      app.logger.error(err)

      process.exit(1)
    }
    app.logger.info(`gRPC listening on ${port}`)
  })
}

main()
