import Fastify from 'fastify'
import fastifyEnv from '@fastify/env'

import Version from './utils/version'
import { ENV_OPTIONS, ENVS } from './env'
import {
  MetricsPlugin,
  LoggerPlugin,
  HealthCheckerPlugin,
  ProviderPlugin,
  BalanceCheckerPlugin,
  GRPCServerPlugin,
  AlertsPlugin,
  ChainHandlerPlugin,
} from './plugins'

const fastify = Fastify({
  logger: true,
})

const fastifyInit = async () => {
  await Promise.all([
    fastify.register(fastifyEnv, ENV_OPTIONS),
    fastify.register(LoggerPlugin),
    fastify.register(ProviderPlugin),
    fastify.register(MetricsPlugin),
    fastify.register(HealthCheckerPlugin),
    fastify.register(BalanceCheckerPlugin),
    fastify.register(AlertsPlugin),
    fastify.register(ChainHandlerPlugin),
    fastify.register(GRPCServerPlugin),
  ])

  fastify.metrics.buildInfo.set({ commitHash: Version.commitHash }, 1)
  await fastify.register(async (instance) => {
    instance.get('/metrics', instance.metrics.routeHandler())
    instance.get('/health', instance.healthChecker.routeHandler())
  })
}

const start = async () => {
  try {
    await fastifyInit()

    const { HTTP_PORT } = fastify.getEnvs<ENVS>()
    await fastify.listen({ port: HTTP_PORT })

    fastify.log.info(`server listening on ${HTTP_PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
process.on('unhandledRejection', function (reason) {
  fastify.logger.error('unhandledRejection', reason)
})

void start()
