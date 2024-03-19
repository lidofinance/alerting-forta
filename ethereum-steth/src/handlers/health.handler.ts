import { HealthChecker } from '../services/health-checker/health-checker.srv'
import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { HealthCheckRequest, HealthCheckResponse, ResponseStatus } from '../proto/agent_pb'
import * as agent_pb from '../proto/agent_pb'

export class HealthHandler {
  private healthChecker: HealthChecker

  constructor(healthChecker: HealthChecker) {
    this.healthChecker = healthChecker
  }

  public handleHealth() {
    return async (
      call: ServerUnaryCall<HealthCheckRequest, HealthCheckResponse>,
      callback: sendUnaryData<HealthCheckResponse>,
    ) => {
      const resp = new HealthCheckResponse()
      resp.setStatus(ResponseStatus.SUCCESS)

      if (!this.healthChecker.isHealth()) {
        const e: agent_pb.Error = new agent_pb.Error()
        e.setMessage('There is too much network errors')

        const errList: Array<agent_pb.Error> = []
        errList.push(e)

        resp.setErrorsList(errList)
      }

      callback(null, resp)
    }
  }
}
