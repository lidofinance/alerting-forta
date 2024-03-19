// GENERATED CODE -- DO NOT EDIT!

// package: network.forta
// file: agent.proto

import * as agent_pb from './agent_pb'
import * as grpc from '@grpc/grpc-js'

interface IAgentService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  initialize: grpc.MethodDefinition<agent_pb.InitializeRequest, agent_pb.InitializeResponse>
  evaluateTx: grpc.MethodDefinition<agent_pb.EvaluateTxRequest, agent_pb.EvaluateTxResponse>
  evaluateBlock: grpc.MethodDefinition<agent_pb.EvaluateBlockRequest, agent_pb.EvaluateBlockResponse>
  evaluateAlert: grpc.MethodDefinition<agent_pb.EvaluateAlertRequest, agent_pb.EvaluateAlertResponse>
  healthCheck: grpc.MethodDefinition<agent_pb.HealthCheckRequest, agent_pb.HealthCheckResponse>
}

export const AgentService: IAgentService

export interface IAgentServer extends grpc.UntypedServiceImplementation {
  initialize: grpc.handleUnaryCall<agent_pb.InitializeRequest, agent_pb.InitializeResponse>
  evaluateTx: grpc.handleUnaryCall<agent_pb.EvaluateTxRequest, agent_pb.EvaluateTxResponse>
  evaluateBlock: grpc.handleUnaryCall<agent_pb.EvaluateBlockRequest, agent_pb.EvaluateBlockResponse>
  evaluateAlert: grpc.handleUnaryCall<agent_pb.EvaluateAlertRequest, agent_pb.EvaluateAlertResponse>
  healthCheck: grpc.handleUnaryCall<agent_pb.HealthCheckRequest, agent_pb.HealthCheckResponse>
}

export class AgentClient extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object)

  initialize(
    argument: agent_pb.InitializeRequest,
    callback: grpc.requestCallback<agent_pb.InitializeResponse>,
  ): grpc.ClientUnaryCall
  initialize(
    argument: agent_pb.InitializeRequest,
    metadataOrOptions: grpc.Metadata | grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.InitializeResponse>,
  ): grpc.ClientUnaryCall
  initialize(
    argument: agent_pb.InitializeRequest,
    metadata: grpc.Metadata | null,
    options: grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.InitializeResponse>,
  ): grpc.ClientUnaryCall

  evaluateTx(
    argument: agent_pb.EvaluateTxRequest,
    callback: grpc.requestCallback<agent_pb.EvaluateTxResponse>,
  ): grpc.ClientUnaryCall
  evaluateTx(
    argument: agent_pb.EvaluateTxRequest,
    metadataOrOptions: grpc.Metadata | grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.EvaluateTxResponse>,
  ): grpc.ClientUnaryCall
  evaluateTx(
    argument: agent_pb.EvaluateTxRequest,
    metadata: grpc.Metadata | null,
    options: grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.EvaluateTxResponse>,
  ): grpc.ClientUnaryCall

  evaluateBlock(
    argument: agent_pb.EvaluateBlockRequest,
    callback: grpc.requestCallback<agent_pb.EvaluateBlockResponse>,
  ): grpc.ClientUnaryCall
  evaluateBlock(
    argument: agent_pb.EvaluateBlockRequest,
    metadataOrOptions: grpc.Metadata | grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.EvaluateBlockResponse>,
  ): grpc.ClientUnaryCall
  evaluateBlock(
    argument: agent_pb.EvaluateBlockRequest,
    metadata: grpc.Metadata | null,
    options: grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.EvaluateBlockResponse>,
  ): grpc.ClientUnaryCall

  evaluateAlert(
    argument: agent_pb.EvaluateAlertRequest,
    callback: grpc.requestCallback<agent_pb.EvaluateAlertResponse>,
  ): grpc.ClientUnaryCall
  evaluateAlert(
    argument: agent_pb.EvaluateAlertRequest,
    metadataOrOptions: grpc.Metadata | grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.EvaluateAlertResponse>,
  ): grpc.ClientUnaryCall
  evaluateAlert(
    argument: agent_pb.EvaluateAlertRequest,
    metadata: grpc.Metadata | null,
    options: grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.EvaluateAlertResponse>,
  ): grpc.ClientUnaryCall

  healthCheck(
    argument: agent_pb.HealthCheckRequest,
    callback: grpc.requestCallback<agent_pb.HealthCheckResponse>,
  ): grpc.ClientUnaryCall
  healthCheck(
    argument: agent_pb.HealthCheckRequest,
    metadataOrOptions: grpc.Metadata | grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.HealthCheckResponse>,
  ): grpc.ClientUnaryCall
  healthCheck(
    argument: agent_pb.HealthCheckRequest,
    metadata: grpc.Metadata | null,
    options: grpc.CallOptions | null,
    callback: grpc.requestCallback<agent_pb.HealthCheckResponse>,
  ): grpc.ClientUnaryCall
}
