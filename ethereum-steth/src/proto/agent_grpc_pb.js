// GENERATED CODE -- DO NOT EDIT!

'use strict'
var grpc = require('@grpc/grpc-js')
var agent_pb = require('./agent_pb.js')
var alert_pb = require('./alert_pb.js')

function serialize_network_forta_EvaluateAlertRequest(arg) {
  if (!(arg instanceof agent_pb.EvaluateAlertRequest)) {
    throw new Error('Expected argument of type network.forta.EvaluateAlertRequest')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_EvaluateAlertRequest(buffer_arg) {
  return agent_pb.EvaluateAlertRequest.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_EvaluateAlertResponse(arg) {
  if (!(arg instanceof agent_pb.EvaluateAlertResponse)) {
    throw new Error('Expected argument of type network.forta.EvaluateAlertResponse')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_EvaluateAlertResponse(buffer_arg) {
  return agent_pb.EvaluateAlertResponse.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_EvaluateBlockRequest(arg) {
  if (!(arg instanceof agent_pb.EvaluateBlockRequest)) {
    throw new Error('Expected argument of type network.forta.EvaluateBlockRequest')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_EvaluateBlockRequest(buffer_arg) {
  return agent_pb.EvaluateBlockRequest.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_EvaluateBlockResponse(arg) {
  if (!(arg instanceof agent_pb.EvaluateBlockResponse)) {
    throw new Error('Expected argument of type network.forta.EvaluateBlockResponse')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_EvaluateBlockResponse(buffer_arg) {
  return agent_pb.EvaluateBlockResponse.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_EvaluateTxRequest(arg) {
  if (!(arg instanceof agent_pb.EvaluateTxRequest)) {
    throw new Error('Expected argument of type network.forta.EvaluateTxRequest')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_EvaluateTxRequest(buffer_arg) {
  return agent_pb.EvaluateTxRequest.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_EvaluateTxResponse(arg) {
  if (!(arg instanceof agent_pb.EvaluateTxResponse)) {
    throw new Error('Expected argument of type network.forta.EvaluateTxResponse')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_EvaluateTxResponse(buffer_arg) {
  return agent_pb.EvaluateTxResponse.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_HealthCheckRequest(arg) {
  if (!(arg instanceof agent_pb.HealthCheckRequest)) {
    throw new Error('Expected argument of type network.forta.HealthCheckRequest')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_HealthCheckRequest(buffer_arg) {
  return agent_pb.HealthCheckRequest.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_HealthCheckResponse(arg) {
  if (!(arg instanceof agent_pb.HealthCheckResponse)) {
    throw new Error('Expected argument of type network.forta.HealthCheckResponse')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_HealthCheckResponse(buffer_arg) {
  return agent_pb.HealthCheckResponse.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_InitializeRequest(arg) {
  if (!(arg instanceof agent_pb.InitializeRequest)) {
    throw new Error('Expected argument of type network.forta.InitializeRequest')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_InitializeRequest(buffer_arg) {
  return agent_pb.InitializeRequest.deserializeBinary(new Uint8Array(buffer_arg))
}

function serialize_network_forta_InitializeResponse(arg) {
  if (!(arg instanceof agent_pb.InitializeResponse)) {
    throw new Error('Expected argument of type network.forta.InitializeResponse')
  }
  return Buffer.from(arg.serializeBinary())
}

function deserialize_network_forta_InitializeResponse(buffer_arg) {
  return agent_pb.InitializeResponse.deserializeBinary(new Uint8Array(buffer_arg))
}

var AgentService = (exports.AgentService = {
  initialize: {
    path: '/network.forta.Agent/Initialize',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.InitializeRequest,
    responseType: agent_pb.InitializeResponse,
    requestSerialize: serialize_network_forta_InitializeRequest,
    requestDeserialize: deserialize_network_forta_InitializeRequest,
    responseSerialize: serialize_network_forta_InitializeResponse,
    responseDeserialize: deserialize_network_forta_InitializeResponse,
  },
  evaluateTx: {
    path: '/network.forta.Agent/EvaluateTx',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.EvaluateTxRequest,
    responseType: agent_pb.EvaluateTxResponse,
    requestSerialize: serialize_network_forta_EvaluateTxRequest,
    requestDeserialize: deserialize_network_forta_EvaluateTxRequest,
    responseSerialize: serialize_network_forta_EvaluateTxResponse,
    responseDeserialize: deserialize_network_forta_EvaluateTxResponse,
  },
  evaluateBlock: {
    path: '/network.forta.Agent/EvaluateBlock',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.EvaluateBlockRequest,
    responseType: agent_pb.EvaluateBlockResponse,
    requestSerialize: serialize_network_forta_EvaluateBlockRequest,
    requestDeserialize: deserialize_network_forta_EvaluateBlockRequest,
    responseSerialize: serialize_network_forta_EvaluateBlockResponse,
    responseDeserialize: deserialize_network_forta_EvaluateBlockResponse,
  },
  evaluateAlert: {
    path: '/network.forta.Agent/EvaluateAlert',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.EvaluateAlertRequest,
    responseType: agent_pb.EvaluateAlertResponse,
    requestSerialize: serialize_network_forta_EvaluateAlertRequest,
    requestDeserialize: deserialize_network_forta_EvaluateAlertRequest,
    responseSerialize: serialize_network_forta_EvaluateAlertResponse,
    responseDeserialize: deserialize_network_forta_EvaluateAlertResponse,
  },
  healthCheck: {
    path: '/network.forta.Agent/HealthCheck',
    requestStream: false,
    responseStream: false,
    requestType: agent_pb.HealthCheckRequest,
    responseType: agent_pb.HealthCheckResponse,
    requestSerialize: serialize_network_forta_HealthCheckRequest,
    requestDeserialize: deserialize_network_forta_HealthCheckRequest,
    responseSerialize: serialize_network_forta_HealthCheckResponse,
    responseDeserialize: deserialize_network_forta_HealthCheckResponse,
  },
})

exports.AgentClient = grpc.makeGenericClientConstructor(AgentService)
