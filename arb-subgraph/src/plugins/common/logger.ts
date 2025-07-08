import * as Winston from 'winston'

import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { ENVS } from '../../env'

declare module 'fastify' {
  interface FastifyInstance {
    logger: Winston.Logger
  }
}

const fastifyLogger: FastifyPluginAsync = async (fastify) => {
  const { LOG_FORMAT } = fastify.getEnvs<ENVS>()

  const logger: Winston.Logger = Winston.createLogger({
    format: LOG_FORMAT === 'simple' ? Winston.format.simple() : Winston.format.json(),
    transports: [new Winston.transports.Console()],
  })

  logger.info('Logger plugin initialized')

  if (!fastify.logger) {
    fastify.decorate('logger', logger)
  }
}

export default fp(fastifyLogger, '4.x')
