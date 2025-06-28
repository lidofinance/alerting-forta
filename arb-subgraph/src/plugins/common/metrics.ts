import { Counter, Gauge, Histogram, Registry, Summary } from 'prom-client'

import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import promClient from 'prom-client'

import { ENVS } from '../../env'

const URL_REGEX = /^(?:https?:\/\/)?(?:www\.)?([^/\n]+)/

declare module 'fastify' {
  interface FastifyInstance {
    metrics: Metrics
  }
}

export class Metrics {
  labels = {
    statusOk: 'ok',
    statusFail: 'fail',
    handleBlock: 'handleBlock',
    handleTx: 'handleTx',
  }

  public readonly registry: Registry
  private readonly prefix: string

  public readonly healthStatus: Gauge
  public readonly buildInfo: Gauge

  public readonly etherJsRequest: Counter
  public readonly networkErrors: Counter
  public readonly lastBlockNumber: Gauge
  public readonly etherJsDurationHistogram: Histogram
  public readonly lastAgentTouch: Gauge
  public readonly processedIterations: Counter
  public readonly summaryHandlers: Summary

  constructor(registry: Registry, prefix: string) {
    this.registry = registry
    this.prefix = prefix

    this.buildInfo = new Gauge({
      name: this.prefix + 'build_info',
      help: 'Build information',
      labelNames: ['commitHash' as const],
      registers: [this.registry],
    })

    this.healthStatus = new Gauge({
      name: this.prefix + 'health_status',
      help: 'Bot health status',
      labelNames: ['instance'] as const,
      registers: [this.registry],
    })

    this.etherJsRequest = new Counter({
      name: this.prefix + 'etherjs_request_total',
      help: 'Total number of requests via ether.js library',
      labelNames: ['method' as const, 'status' as const] as const,
      registers: [this.registry],
    })

    this.etherJsDurationHistogram = new Histogram({
      name: this.prefix + 'ether_requests_duration_seconds',
      help: 'Histogram of the duration of requests in seconds',
      labelNames: ['method', 'status'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2.5, 5, 10],
    })

    this.lastAgentTouch = new Gauge({
      name: this.prefix + 'block_timestamp',
      help: 'The last agent iteration',
      labelNames: ['method' as const] as const,
      registers: [this.registry],
    })

    this.lastBlockNumber = new Gauge({
      name: this.prefix + 'last_block_number',
      help: 'The last agent block number',
      registers: [this.registry],
    })

    this.networkErrors = new Counter({
      name: this.prefix + 'network_errors_total',
      help: 'Total number of network errors',
      registers: [this.registry],
    })

    this.processedIterations = new Counter({
      name: this.prefix + 'processed_iterations_total',
      help: 'Total number of finding iterations',
      labelNames: ['method', 'status'],
      registers: [this.registry],
    })

    this.summaryHandlers = new Summary({
      name: this.prefix + 'request_processing_seconds',
      help: 'Time spent processing request (block or transaction)',
      labelNames: ['method'],
      registers: [this.registry],
    })
  }

  public routeHandler() {
    return async (_: FastifyRequest, res: FastifyReply) => {
      res.type(this.registry.contentType)
      const metrics = await this.registry.metrics()

      res.send(metrics)
    }
  }
}

const fastifyMetrics: FastifyPluginAsync = async (fastify) => {
  const { logger } = fastify
  const { APP_NAME, INSTANCE, ARBITRUM_RPC_URL } = fastify.getEnvs<ENVS>()

  const dataProviderMatch = ARBITRUM_RPC_URL.match(URL_REGEX)
  const prefix = APP_NAME.replaceAll('-', '_')

  const defaultRegistry = promClient
  defaultRegistry.collectDefaultMetrics({ prefix })

  const customRegister = new promClient.Registry()
  const mergedRegistry = promClient.Registry.merge([defaultRegistry.register, customRegister])
  mergedRegistry.setDefaultLabels({ instance: INSTANCE, dataProvider: dataProviderMatch?.[1] })

  const metrics = new Metrics(mergedRegistry, prefix)

  logger.info('Metrics plugin initialized')

  if (!fastify.metrics) {
    fastify.decorate('metrics', metrics)
  }
}

export default fp(fastifyMetrics, '4.x')
