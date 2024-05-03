import { Gauge, Registry } from 'prom-client'

export class Metrics {
  private readonly registry: Registry
  private readonly prefix: string

  private readonly healthStatus: Gauge
  private readonly buildInfo: Gauge

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
  }

  public build(): Gauge {
    return this.buildInfo
  }

  public health(): Gauge {
    return this.healthStatus
  }
}
