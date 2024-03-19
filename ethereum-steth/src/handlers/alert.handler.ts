import { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'
import { EvaluateAlertRequest, EvaluateAlertResponse, ResponseStatus } from '../proto/agent_pb'

export class AlertHandler {
  public handleAlert() {
    return async (
      call: ServerUnaryCall<EvaluateAlertRequest, EvaluateAlertResponse>,
      callback: sendUnaryData<EvaluateAlertResponse>,
    ) => {
      const resp = new EvaluateAlertResponse()
      resp.setStatus(ResponseStatus.SUCCESS)
      resp.setFindingsList([])
      resp.setTimestamp(new Date().toISOString())

      callback(null, resp)
    }
  }
}
