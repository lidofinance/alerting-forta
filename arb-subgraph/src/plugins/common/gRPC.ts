import * as grpc from '@grpc/grpc-js'

import { AgentService } from '../../generated/proto/agent_grpc_pb'

import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { ENVS } from '../../env'

declare module 'fastify' {
  interface FastifyInstance {
    gRPCserver: grpc.Server
  }
}

const fastifyGRPCserver: FastifyPluginAsync = async (fastify) => {
  const { AGENT_GRPC_PORT, APP_NAME } = fastify.getEnvs<ENVS>()
  const { logger, alerts, chainHandler, healthChecker } = fastify

  const gRPCserver = new grpc.Server()

  gRPCserver.addService(AgentService, {
    initialize: alerts.initialization(),
    evaluateBlock: chainHandler.handleBlock(),
    // evaluateTx: txH.handleTx(),
    healthCheck: healthChecker.healthGrpc(),
    // not used, but required for grpc contract
    evaluateAlert: alerts.handleAlert(),
  })

  gRPCserver.bindAsync(`0.0.0.0:${AGENT_GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err != null) {
      logger.error(err)

      process.exit(1)
    }
    logger.info(`${APP_NAME} is listening on ${port}`)
  })

  logger.info('gRPC server plugin initialized')

  if (!fastify.gRPCserver) {
    fastify.decorate('gRPCserver', gRPCserver)
  }
}

export default fp(fastifyGRPCserver, '4.x')
