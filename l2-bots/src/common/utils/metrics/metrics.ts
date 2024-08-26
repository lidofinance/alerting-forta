import promClient, { Counter, Gauge, Histogram, Registry, Summary } from 'prom-client'


export const StatusOK = 'ok'
export const StatusFail = 'fail'
export const HandleL1BlockLabel = 'handleL1Block'
export const HandleL2BlockLabel = 'handleL2Block'
export const HandleTxLabel = 'handleTx'

export const chainL2 = `l2`
export const chainL1 = `l1`
export const ldo = `ldo`
export const stETH = `stETH`
export const wStETH = `wStETH`


export function createMetrics({ l1RpcUrl, APP_NAME, instance } : {l1RpcUrl: string, APP_NAME: string, instance: string}) {
  const defaultRegistry = promClient
  defaultRegistry.collectDefaultMetrics()

  let dataProvider = ''
  const urlRegex = /^(?:https?:\/\/)?(?:www\.)?([^/\n]+)/
  const match = l1RpcUrl.match(urlRegex)
  if (match) {
    dataProvider = match[1]
  }
  const customRegister = new promClient.Registry()
  const mergedRegistry = promClient.Registry.merge([defaultRegistry.register, customRegister])
  const promPrefix = APP_NAME.replace('-', '_')
  mergedRegistry.setDefaultLabels({
    instance: instance,
    dataProvider: dataProvider,
    botName: promPrefix,
  })
  return new Metrics(mergedRegistry)
}

export class Metrics {
  public readonly registry: Registry

  public readonly healthStatus: Gauge
  public readonly buildInfo: Gauge

  public readonly etherJsRequest: Counter
  public readonly networkErrors: Counter
  public readonly lastBlockNumber: Gauge
  public readonly etherJsDurationHistogram: Histogram
  public readonly lastAgentTouch: Gauge
  public readonly processedIterations: Counter
  public readonly summaryHandlers: Summary
  public readonly bridgeBalance: Gauge

  constructor(registry: Registry) {
    this.registry = registry

    this.buildInfo = new Gauge({
      name: 'build_info',
      help: 'Build information',
      labelNames: ['commitHash' as const],
      registers: [this.registry],
    })

    this.healthStatus = new Gauge({
      name: 'health_status',
      help: 'Bot health status',
      labelNames: ['instance'] as const,
      registers: [this.registry],
    })

    this.etherJsRequest = new Counter({
      name: 'etherjs_request_total',
      help: 'Total number of requests via ether.js library',
      labelNames: ['method' as const, 'status' as const] as const,
      registers: [this.registry],
    })

    this.etherJsDurationHistogram = new Histogram({
      name: 'ether_requests_duration_seconds',
      help: 'Histogram of the duration of requests in seconds',
      labelNames: ['method', 'status'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2.5, 5, 10],
    })

    this.lastAgentTouch = new Gauge({
      name: 'block_timestamp',
      help: 'The last agent iteration',
      labelNames: ['method' as const] as const,
      registers: [this.registry],
    })

    this.lastBlockNumber = new Gauge({
      name: 'last_block_number',
      help: 'The last agent block number',
      registers: [this.registry],
    })

    this.networkErrors = new Counter({
      name: 'network_errors_total',
      help: 'Total number of network errors',
      registers: [this.registry],
    })

    this.processedIterations = new Counter({
      name: 'processed_iterations_total',
      help: 'Total number of finding iterations',
      labelNames: ['method', 'status'],
      registers: [this.registry],
    })

    this.summaryHandlers = new Summary({
      name: 'request_processing_seconds',
      help: 'Time spent processing request (block or transaction)',
      labelNames: ['method'],
      registers: [this.registry],
    })

    // Only for L2 bots
    this.bridgeBalance = new Gauge({
      name: 'bridge_balance',
      help: 'Bridge balance',
      labelNames: ['token', 'chain'] as const,
      registers: [this.registry],
    })
  }
}
