import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { HealthCheckRequest, HealthCheckResponse, ResponseStatus } from '../generated/proto/agent_pb'
import * as agent_pb from '../generated/proto/agent_pb'
import { Metrics } from '../utils/metrics/metrics'

export class HealthHandler {
  private healthChecker: HealthChecker
  private metrics: Metrics

  constructor(healthChecker: HealthChecker, metrics: Metrics) {
    this.healthChecker = healthChecker
    this.metrics = metrics
  }

  public handleHealth() {
    return async (
      call: ServerUnaryCall<HealthCheckRequest, HealthCheckResponse>,
      callback: sendUnaryData<HealthCheckResponse>,
    ) => {
      const resp = new HealthCheckResponse()
      resp.setStatus(ResponseStatus.SUCCESS)
      this.metrics.health().set(1)

      if (!this.healthChecker.isHealth()) {
        const e: agent_pb.Error = new agent_pb.Error()
        e.setMessage('There is too much network errors')

        const errList: Array<agent_pb.Error> = []
        errList.push(e)

        resp.setErrorsList(errList)
        this.metrics.health().set(0)
      }

      callback(null, resp)
    }
  }
}
