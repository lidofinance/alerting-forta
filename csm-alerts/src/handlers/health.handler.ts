import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import * as agent_pb from '../generated/proto/agent_pb'
import { HealthCheckRequest, HealthCheckResponse, ResponseStatus } from '../generated/proto/agent_pb'
import { Metrics } from '../utils/metrics/metrics'
import express, { Request, Response } from 'express'
import BigNumber from 'bignumber.js'
import { Logger } from 'winston'

export class HealthHandler {
  private healthChecker: HealthChecker
  private metrics: Metrics
  private logger: Logger
  private readonly ethereumRpcUrl: string
  private readonly chainId: number

  constructor(healthChecker: HealthChecker, metrics: Metrics, logger: Logger, ethereumRpcUrl: string, chainId: number) {
    this.healthChecker = healthChecker
    this.metrics = metrics
    this.logger = logger
    this.ethereumRpcUrl = ethereumRpcUrl
    this.chainId = chainId
  }

  public healthGrpc() {
    return async (
      call: ServerUnaryCall<HealthCheckRequest, HealthCheckResponse>,
      callback: sendUnaryData<HealthCheckResponse>,
    ) => {
      const resp = new HealthCheckResponse()
      resp.setStatus(ResponseStatus.SUCCESS)
      this.metrics.healthStatus.set(1)

      if (!this.healthChecker.isHealth()) {
        const e: agent_pb.Error = new agent_pb.Error()
        e.setMessage('There is too much network errors')

        const errList: Array<agent_pb.Error> = []
        errList.push(e)

        resp.setErrorsList(errList)
        this.metrics.healthStatus.set(0)
      }

      callback(null, resp)
    }
  }

  public healthHttp(): express.Handler {
    return async (req: Request, res: Response) => {
      try {
        type data = {
          jsonrpc: string
          id: number
          result: string
        }

        const resp = await fetch(this.ethereumRpcUrl, {
          method: 'POST',
          body: JSON.stringify({
            method: 'eth_chainId',
          }),
        })

        // @ts-expect-error @typescript-eslint/ban-ts-comment
        const data: data = await resp.json()
        const chainId = new BigNumber(data.result)
        if (chainId.toNumber() === this.chainId) {
          return res.status(200).send('ok')
        }
      } catch (e) {
        this.logger.error(e)
      }

      return res.status(503).send('not ok')
    }
  }
}
