import { FastifyPluginAsync, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'

import { Finding } from '../../generated/proto/alert_pb'
import { HealthCheckRequest, HealthCheckResponse, ResponseStatus, Error } from '../../generated/proto/agent_pb'
import { ENVS } from '../../env'

const BORDER_TIME = 15 * 60 * 1000 // 15 minutes
const MAX_NUMBER_ERRORS_PER_BORDER_TIME = 25
const NETWORK_ERROR_FINDING = 'NETWORK-ERROR'

declare module 'fastify' {
  interface FastifyInstance {
    healthChecker: HealthChecker
  }
}

export class HealthChecker {
  private errorCount: number
  private isAppOk: boolean

  private fastify: FastifyInstance

  private errorStartedAt: number | null
  private chainId: number

  constructor(fastify: FastifyInstance, chainId: number) {
    this.fastify = fastify
    this.chainId = chainId

    this.errorCount = 0
    this.errorStartedAt = null
    this.isAppOk = true
  }

  public check(findings: Finding[]): number {
    const currentTime = Date.now()

    let errCount: number = 0
    for (const f of findings) {
      if (f.getAlertid() === NETWORK_ERROR_FINDING) {
        this.fastify.logger.warn(f.getName(), {
          desc: f.getDescription(),
          err: {
            stack: f.getMetadataMap().stack,
            msg: f.getMetadataMap().message,
            err: f.getMetadataMap().name,
          },
        })
        errCount += 1

        this.fastify.metrics.networkErrors.inc()
      }
    }

    // if for one iteration we have more than maxCountErrors
    // then app is unhealthy
    if (errCount >= MAX_NUMBER_ERRORS_PER_BORDER_TIME) {
      this.isAppOk = false
      return errCount
    }

    if (this.errorStartedAt === null && errCount > 0) {
      this.errorStartedAt = currentTime
    }

    this.errorCount += errCount

    if (this.errorStartedAt !== null && currentTime - this.errorStartedAt >= BORDER_TIME) {
      if (this.errorCount >= MAX_NUMBER_ERRORS_PER_BORDER_TIME) {
        this.isAppOk = false
      } else {
        this.errorCount = 0
        this.errorStartedAt = null
      }
    }

    return errCount
  }

  public isHealth(): boolean {
    return this.isAppOk
  }

  public async isHTTPHealth(): Promise<boolean> {
    try {
      const resp = await this.fastify.provider.send('eth_chainId', [])
      const chainId = Number(resp)

      if (chainId === this.chainId) {
        return true
      }

      return false
    } catch (e) {
      this.fastify.logger.error(e)
      return false
    }
  }

  public healthGrpc() {
    return async (
      _call: ServerUnaryCall<HealthCheckRequest, HealthCheckResponse>,
      callback: sendUnaryData<HealthCheckResponse>,
    ) => {
      const resp = new HealthCheckResponse()
      resp.setStatus(ResponseStatus.SUCCESS)
      this.fastify.metrics.healthStatus.set(1)

      if (!this.fastify.healthChecker.isHealth()) {
        const e: Error = new Error()
        e.setMessage('There is too much network errors')

        const errList: Array<Error> = []
        errList.push(e)

        resp.setErrorsList(errList)
        this.fastify.metrics.healthStatus.set(0)
      }

      callback(null, resp)
    }
  }

  public routeHandler() {
    return async (_: FastifyRequest, res: FastifyReply) => {
      const isHTTPHealth = await this.isHTTPHealth()
      if (!isHTTPHealth) {
        return res.status(503).send('not ok')
      }

      return res.status(200).send('ok')
    }
  }
}

const fastifyHealthChecker: FastifyPluginAsync = async (fastify) => {
  const { logger } = fastify
  const { FORTA_CHAIN_ID } = fastify.getEnvs<ENVS>()

  const healthChecker = new HealthChecker(fastify, FORTA_CHAIN_ID)

  logger.info('HealthChecker plugin initialized')

  if (!fastify.healthChecker) {
    fastify.decorate('healthChecker', healthChecker)
  }
}

export default fp(fastifyHealthChecker, '4.x')
