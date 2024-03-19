// package: network.forta
// file: agent.proto

import * as jspb from 'google-protobuf'
import * as alert_pb from './alert_pb'

export class Error extends jspb.Message {
  getMessage(): string

  setMessage(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): Error.AsObject

  static toObject(includeInstance: boolean, msg: Error): Error.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: Error, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): Error

  static deserializeBinaryFromReader(message: Error, reader: jspb.BinaryReader): Error
}

export namespace Error {
  export type AsObject = {
    message: string
  }
}

export class HealthCheckRequest extends jspb.Message {
  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): HealthCheckRequest.AsObject

  static toObject(includeInstance: boolean, msg: HealthCheckRequest): HealthCheckRequest.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: HealthCheckRequest, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): HealthCheckRequest

  static deserializeBinaryFromReader(message: HealthCheckRequest, reader: jspb.BinaryReader): HealthCheckRequest
}

export namespace HealthCheckRequest {
  export type AsObject = {}
}

export class HealthCheckResponse extends jspb.Message {
  getStatus(): HealthCheckResponse.ResponseStatusMap[keyof HealthCheckResponse.ResponseStatusMap]

  setStatus(value: HealthCheckResponse.ResponseStatusMap[keyof HealthCheckResponse.ResponseStatusMap]): void

  clearErrorsList(): void

  getErrorsList(): Array<Error>

  setErrorsList(value: Array<Error>): void

  addErrors(value?: Error, index?: number): Error

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): HealthCheckResponse.AsObject

  static toObject(includeInstance: boolean, msg: HealthCheckResponse): HealthCheckResponse.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: HealthCheckResponse, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): HealthCheckResponse

  static deserializeBinaryFromReader(message: HealthCheckResponse, reader: jspb.BinaryReader): HealthCheckResponse
}

export namespace HealthCheckResponse {
  export type AsObject = {
    status: HealthCheckResponse.ResponseStatusMap[keyof HealthCheckResponse.ResponseStatusMap]
    errorsList: Array<Error.AsObject>
  }

  export interface ResponseStatusMap {
    UNKNOWN: 0
    ERROR: 1
    SUCCESS: 2
  }

  export const ResponseStatus: ResponseStatusMap
}

export class InitializeRequest extends jspb.Message {
  getAgentid(): string

  setAgentid(value: string): void

  getProxyhost(): string

  setProxyhost(value: string): void

  getShardid(): number

  setShardid(value: number): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): InitializeRequest.AsObject

  static toObject(includeInstance: boolean, msg: InitializeRequest): InitializeRequest.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: InitializeRequest, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): InitializeRequest

  static deserializeBinaryFromReader(message: InitializeRequest, reader: jspb.BinaryReader): InitializeRequest
}

export namespace InitializeRequest {
  export type AsObject = {
    agentid: string
    proxyhost: string
    shardid: number
  }
}

export class InitializeResponse extends jspb.Message {
  getStatus(): ResponseStatusMap[keyof ResponseStatusMap]

  setStatus(value: ResponseStatusMap[keyof ResponseStatusMap]): void

  clearErrorsList(): void

  getErrorsList(): Array<Error>

  setErrorsList(value: Array<Error>): void

  addErrors(value?: Error, index?: number): Error

  clearAddressesList(): void

  getAddressesList(): Array<string>

  setAddressesList(value: Array<string>): void

  addAddresses(value: string, index?: number): string

  hasAlertconfig(): boolean

  clearAlertconfig(): void

  getAlertconfig(): AlertConfig | undefined

  setAlertconfig(value?: AlertConfig): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): InitializeResponse.AsObject

  static toObject(includeInstance: boolean, msg: InitializeResponse): InitializeResponse.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: InitializeResponse, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): InitializeResponse

  static deserializeBinaryFromReader(message: InitializeResponse, reader: jspb.BinaryReader): InitializeResponse
}

export namespace InitializeResponse {
  export type AsObject = {
    status: ResponseStatusMap[keyof ResponseStatusMap]
    errorsList: Array<Error.AsObject>
    addressesList: Array<string>
    alertconfig?: AlertConfig.AsObject
  }
}

export class AlertConfig extends jspb.Message {
  clearSubscriptionsList(): void

  getSubscriptionsList(): Array<CombinerBotSubscription>

  setSubscriptionsList(value: Array<CombinerBotSubscription>): void

  addSubscriptions(value?: CombinerBotSubscription, index?: number): CombinerBotSubscription

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): AlertConfig.AsObject

  static toObject(includeInstance: boolean, msg: AlertConfig): AlertConfig.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: AlertConfig, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): AlertConfig

  static deserializeBinaryFromReader(message: AlertConfig, reader: jspb.BinaryReader): AlertConfig
}

export namespace AlertConfig {
  export type AsObject = {
    subscriptionsList: Array<CombinerBotSubscription.AsObject>
  }
}

export class CombinerBotSubscription extends jspb.Message {
  getBotid(): string

  setBotid(value: string): void

  getAlertid(): string

  setAlertid(value: string): void

  clearAlertidsList(): void

  getAlertidsList(): Array<string>

  setAlertidsList(value: Array<string>): void

  addAlertids(value: string, index?: number): string

  getChainid(): number

  setChainid(value: number): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): CombinerBotSubscription.AsObject

  static toObject(includeInstance: boolean, msg: CombinerBotSubscription): CombinerBotSubscription.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: CombinerBotSubscription, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): CombinerBotSubscription

  static deserializeBinaryFromReader(
    message: CombinerBotSubscription,
    reader: jspb.BinaryReader,
  ): CombinerBotSubscription
}

export namespace CombinerBotSubscription {
  export type AsObject = {
    botid: string
    alertid: string
    alertidsList: Array<string>
    chainid: number
  }
}

export class EvaluateTxRequest extends jspb.Message {
  getRequestid(): string

  setRequestid(value: string): void

  hasEvent(): boolean

  clearEvent(): void

  getEvent(): TransactionEvent | undefined

  setEvent(value?: TransactionEvent): void

  getShardid(): number

  setShardid(value: number): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): EvaluateTxRequest.AsObject

  static toObject(includeInstance: boolean, msg: EvaluateTxRequest): EvaluateTxRequest.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: EvaluateTxRequest, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): EvaluateTxRequest

  static deserializeBinaryFromReader(message: EvaluateTxRequest, reader: jspb.BinaryReader): EvaluateTxRequest
}

export namespace EvaluateTxRequest {
  export type AsObject = {
    requestid: string
    event?: TransactionEvent.AsObject
    shardid: number
  }
}

export class EvaluateBlockRequest extends jspb.Message {
  getRequestid(): string

  setRequestid(value: string): void

  hasEvent(): boolean

  clearEvent(): void

  getEvent(): BlockEvent | undefined

  setEvent(value?: BlockEvent): void

  getShardid(): number

  setShardid(value: number): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): EvaluateBlockRequest.AsObject

  static toObject(includeInstance: boolean, msg: EvaluateBlockRequest): EvaluateBlockRequest.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: EvaluateBlockRequest, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): EvaluateBlockRequest

  static deserializeBinaryFromReader(message: EvaluateBlockRequest, reader: jspb.BinaryReader): EvaluateBlockRequest
}

export namespace EvaluateBlockRequest {
  export type AsObject = {
    requestid: string
    event?: BlockEvent.AsObject
    shardid: number
  }
}

export class EvaluateAlertRequest extends jspb.Message {
  getRequestid(): string

  setRequestid(value: string): void

  hasEvent(): boolean

  clearEvent(): void

  getEvent(): AlertEvent | undefined

  setEvent(value?: AlertEvent): void

  getTargetbotid(): string

  setTargetbotid(value: string): void

  getShardid(): number

  setShardid(value: number): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): EvaluateAlertRequest.AsObject

  static toObject(includeInstance: boolean, msg: EvaluateAlertRequest): EvaluateAlertRequest.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: EvaluateAlertRequest, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): EvaluateAlertRequest

  static deserializeBinaryFromReader(message: EvaluateAlertRequest, reader: jspb.BinaryReader): EvaluateAlertRequest
}

export namespace EvaluateAlertRequest {
  export type AsObject = {
    requestid: string
    event?: AlertEvent.AsObject
    targetbotid: string
    shardid: number
  }
}

export class EvaluateTxResponse extends jspb.Message {
  getStatus(): ResponseStatusMap[keyof ResponseStatusMap]

  setStatus(value: ResponseStatusMap[keyof ResponseStatusMap]): void

  clearErrorsList(): void

  getErrorsList(): Array<Error>

  setErrorsList(value: Array<Error>): void

  addErrors(value?: Error, index?: number): Error

  clearFindingsList(): void

  getFindingsList(): Array<alert_pb.Finding>

  setFindingsList(value: Array<alert_pb.Finding>): void

  addFindings(value?: alert_pb.Finding, index?: number): alert_pb.Finding

  getMetadataMap(): jspb.Map<string, string>

  clearMetadataMap(): void

  getTimestamp(): string

  setTimestamp(value: string): void

  getLatencyms(): number

  setLatencyms(value: number): void

  getPrivate(): boolean

  setPrivate(value: boolean): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): EvaluateTxResponse.AsObject

  static toObject(includeInstance: boolean, msg: EvaluateTxResponse): EvaluateTxResponse.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: EvaluateTxResponse, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): EvaluateTxResponse

  static deserializeBinaryFromReader(message: EvaluateTxResponse, reader: jspb.BinaryReader): EvaluateTxResponse
}

export namespace EvaluateTxResponse {
  export type AsObject = {
    status: ResponseStatusMap[keyof ResponseStatusMap]
    errorsList: Array<Error.AsObject>
    findingsList: Array<alert_pb.Finding.AsObject>
    metadataMap: Array<[string, string]>
    timestamp: string
    latencyms: number
    pb_private: boolean
  }
}

export class EvaluateBlockResponse extends jspb.Message {
  getStatus(): ResponseStatusMap[keyof ResponseStatusMap]

  setStatus(value: ResponseStatusMap[keyof ResponseStatusMap]): void

  clearErrorsList(): void

  getErrorsList(): Array<Error>

  setErrorsList(value: Array<Error>): void

  addErrors(value?: Error, index?: number): Error

  clearFindingsList(): void

  getFindingsList(): Array<alert_pb.Finding>

  setFindingsList(value: Array<alert_pb.Finding>): void

  addFindings(value?: alert_pb.Finding, index?: number): alert_pb.Finding

  getMetadataMap(): jspb.Map<string, string>

  clearMetadataMap(): void

  getTimestamp(): string

  setTimestamp(value: string): void

  getLatencyms(): number

  setLatencyms(value: number): void

  getPrivate(): boolean

  setPrivate(value: boolean): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): EvaluateBlockResponse.AsObject

  static toObject(includeInstance: boolean, msg: EvaluateBlockResponse): EvaluateBlockResponse.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: EvaluateBlockResponse, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): EvaluateBlockResponse

  static deserializeBinaryFromReader(message: EvaluateBlockResponse, reader: jspb.BinaryReader): EvaluateBlockResponse
}

export namespace EvaluateBlockResponse {
  export type AsObject = {
    status: ResponseStatusMap[keyof ResponseStatusMap]
    errorsList: Array<Error.AsObject>
    findingsList: Array<alert_pb.Finding.AsObject>
    metadataMap: Array<[string, string]>
    timestamp: string
    latencyms: number
    pb_private: boolean
  }
}

export class EvaluateAlertResponse extends jspb.Message {
  getStatus(): ResponseStatusMap[keyof ResponseStatusMap]

  setStatus(value: ResponseStatusMap[keyof ResponseStatusMap]): void

  clearErrorsList(): void

  getErrorsList(): Array<Error>

  setErrorsList(value: Array<Error>): void

  addErrors(value?: Error, index?: number): Error

  clearFindingsList(): void

  getFindingsList(): Array<alert_pb.Finding>

  setFindingsList(value: Array<alert_pb.Finding>): void

  addFindings(value?: alert_pb.Finding, index?: number): alert_pb.Finding

  getMetadataMap(): jspb.Map<string, string>

  clearMetadataMap(): void

  getTimestamp(): string

  setTimestamp(value: string): void

  getLatencyms(): number

  setLatencyms(value: number): void

  getPrivate(): boolean

  setPrivate(value: boolean): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): EvaluateAlertResponse.AsObject

  static toObject(includeInstance: boolean, msg: EvaluateAlertResponse): EvaluateAlertResponse.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: EvaluateAlertResponse, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): EvaluateAlertResponse

  static deserializeBinaryFromReader(message: EvaluateAlertResponse, reader: jspb.BinaryReader): EvaluateAlertResponse
}

export namespace EvaluateAlertResponse {
  export type AsObject = {
    status: ResponseStatusMap[keyof ResponseStatusMap]
    errorsList: Array<Error.AsObject>
    findingsList: Array<alert_pb.Finding.AsObject>
    metadataMap: Array<[string, string]>
    timestamp: string
    latencyms: number
    pb_private: boolean
  }
}

export class BlockEvent extends jspb.Message {
  getType(): BlockEvent.EventTypeMap[keyof BlockEvent.EventTypeMap]

  setType(value: BlockEvent.EventTypeMap[keyof BlockEvent.EventTypeMap]): void

  getBlockhash(): string

  setBlockhash(value: string): void

  getBlocknumber(): string

  setBlocknumber(value: string): void

  hasNetwork(): boolean

  clearNetwork(): void

  getNetwork(): BlockEvent.Network | undefined

  setNetwork(value?: BlockEvent.Network): void

  hasBlock(): boolean

  clearBlock(): void

  getBlock(): BlockEvent.EthBlock | undefined

  setBlock(value?: BlockEvent.EthBlock): void

  hasTimestamps(): boolean

  clearTimestamps(): void

  getTimestamps(): alert_pb.TrackingTimestamps | undefined

  setTimestamps(value?: alert_pb.TrackingTimestamps): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): BlockEvent.AsObject

  static toObject(includeInstance: boolean, msg: BlockEvent): BlockEvent.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: BlockEvent, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): BlockEvent

  static deserializeBinaryFromReader(message: BlockEvent, reader: jspb.BinaryReader): BlockEvent
}

export namespace BlockEvent {
  export type AsObject = {
    type: BlockEvent.EventTypeMap[keyof BlockEvent.EventTypeMap]
    blockhash: string
    blocknumber: string
    network?: BlockEvent.Network.AsObject
    block?: BlockEvent.EthBlock.AsObject
    timestamps?: alert_pb.TrackingTimestamps.AsObject
  }

  export class Network extends jspb.Message {
    getChainid(): string

    setChainid(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): Network.AsObject

    static toObject(includeInstance: boolean, msg: Network): Network.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: Network, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): Network

    static deserializeBinaryFromReader(message: Network, reader: jspb.BinaryReader): Network
  }

  export namespace Network {
    export type AsObject = {
      chainid: string
    }
  }

  export class EthBlock extends jspb.Message {
    getDifficulty(): string

    setDifficulty(value: string): void

    getExtradata(): string

    setExtradata(value: string): void

    getGaslimit(): string

    setGaslimit(value: string): void

    getGasused(): string

    setGasused(value: string): void

    getHash(): string

    setHash(value: string): void

    getLogsbloom(): string

    setLogsbloom(value: string): void

    getMiner(): string

    setMiner(value: string): void

    getMixhash(): string

    setMixhash(value: string): void

    getNonce(): string

    setNonce(value: string): void

    getNumber(): string

    setNumber(value: string): void

    getParenthash(): string

    setParenthash(value: string): void

    getReceiptsroot(): string

    setReceiptsroot(value: string): void

    getSha3uncles(): string

    setSha3uncles(value: string): void

    getSize(): string

    setSize(value: string): void

    getStateroot(): string

    setStateroot(value: string): void

    getTimestamp(): string

    setTimestamp(value: string): void

    getTotaldifficulty(): string

    setTotaldifficulty(value: string): void

    clearTransactionsList(): void

    getTransactionsList(): Array<string>

    setTransactionsList(value: Array<string>): void

    addTransactions(value: string, index?: number): string

    getTransactionsroot(): string

    setTransactionsroot(value: string): void

    clearUnclesList(): void

    getUnclesList(): Array<string>

    setUnclesList(value: Array<string>): void

    addUncles(value: string, index?: number): string

    getBasefeepergas(): string

    setBasefeepergas(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): EthBlock.AsObject

    static toObject(includeInstance: boolean, msg: EthBlock): EthBlock.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: EthBlock, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): EthBlock

    static deserializeBinaryFromReader(message: EthBlock, reader: jspb.BinaryReader): EthBlock
  }

  export namespace EthBlock {
    export type AsObject = {
      difficulty: string
      extradata: string
      gaslimit: string
      gasused: string
      hash: string
      logsbloom: string
      miner: string
      mixhash: string
      nonce: string
      number: string
      parenthash: string
      receiptsroot: string
      sha3uncles: string
      size: string
      stateroot: string
      timestamp: string
      totaldifficulty: string
      transactionsList: Array<string>
      transactionsroot: string
      unclesList: Array<string>
      basefeepergas: string
    }
  }

  export interface EventTypeMap {
    BLOCK: 0
    REORG: 1
  }

  export const EventType: EventTypeMap
}

export class TransactionEvent extends jspb.Message {
  getType(): TransactionEvent.EventTypeMap[keyof TransactionEvent.EventTypeMap]

  setType(value: TransactionEvent.EventTypeMap[keyof TransactionEvent.EventTypeMap]): void

  hasTransaction(): boolean

  clearTransaction(): void

  getTransaction(): TransactionEvent.EthTransaction | undefined

  setTransaction(value?: TransactionEvent.EthTransaction): void

  hasReceipt(): boolean

  clearReceipt(): void

  getReceipt(): TransactionEvent.EthReceipt | undefined

  setReceipt(value?: TransactionEvent.EthReceipt): void

  hasNetwork(): boolean

  clearNetwork(): void

  getNetwork(): TransactionEvent.Network | undefined

  setNetwork(value?: TransactionEvent.Network): void

  clearTracesList(): void

  getTracesList(): Array<TransactionEvent.Trace>

  setTracesList(value: Array<TransactionEvent.Trace>): void

  addTraces(value?: TransactionEvent.Trace, index?: number): TransactionEvent.Trace

  getAddressesMap(): jspb.Map<string, boolean>

  clearAddressesMap(): void

  hasBlock(): boolean

  clearBlock(): void

  getBlock(): TransactionEvent.EthBlock | undefined

  setBlock(value?: TransactionEvent.EthBlock): void

  clearLogsList(): void

  getLogsList(): Array<TransactionEvent.Log>

  setLogsList(value: Array<TransactionEvent.Log>): void

  addLogs(value?: TransactionEvent.Log, index?: number): TransactionEvent.Log

  getIscontractdeployment(): boolean

  setIscontractdeployment(value: boolean): void

  getContractaddress(): string

  setContractaddress(value: string): void

  hasTimestamps(): boolean

  clearTimestamps(): void

  getTimestamps(): alert_pb.TrackingTimestamps | undefined

  setTimestamps(value?: alert_pb.TrackingTimestamps): void

  getTxaddressesMap(): jspb.Map<string, boolean>

  clearTxaddressesMap(): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): TransactionEvent.AsObject

  static toObject(includeInstance: boolean, msg: TransactionEvent): TransactionEvent.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: TransactionEvent, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): TransactionEvent

  static deserializeBinaryFromReader(message: TransactionEvent, reader: jspb.BinaryReader): TransactionEvent
}

export namespace TransactionEvent {
  export type AsObject = {
    type: TransactionEvent.EventTypeMap[keyof TransactionEvent.EventTypeMap]
    transaction?: TransactionEvent.EthTransaction.AsObject
    receipt?: TransactionEvent.EthReceipt.AsObject
    network?: TransactionEvent.Network.AsObject
    tracesList: Array<TransactionEvent.Trace.AsObject>
    addressesMap: Array<[string, boolean]>
    block?: TransactionEvent.EthBlock.AsObject
    logsList: Array<TransactionEvent.Log.AsObject>
    iscontractdeployment: boolean
    contractaddress: string
    timestamps?: alert_pb.TrackingTimestamps.AsObject
    txaddressesMap: Array<[string, boolean]>
  }

  export class Network extends jspb.Message {
    getChainid(): string

    setChainid(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): Network.AsObject

    static toObject(includeInstance: boolean, msg: Network): Network.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: Network, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): Network

    static deserializeBinaryFromReader(message: Network, reader: jspb.BinaryReader): Network
  }

  export namespace Network {
    export type AsObject = {
      chainid: string
    }
  }

  export class EthBlock extends jspb.Message {
    getBlockhash(): string

    setBlockhash(value: string): void

    getBlocknumber(): string

    setBlocknumber(value: string): void

    getBlocktimestamp(): string

    setBlocktimestamp(value: string): void

    getBasefeepergas(): string

    setBasefeepergas(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): EthBlock.AsObject

    static toObject(includeInstance: boolean, msg: EthBlock): EthBlock.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: EthBlock, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): EthBlock

    static deserializeBinaryFromReader(message: EthBlock, reader: jspb.BinaryReader): EthBlock
  }

  export namespace EthBlock {
    export type AsObject = {
      blockhash: string
      blocknumber: string
      blocktimestamp: string
      basefeepergas: string
    }
  }

  export class EthTransaction extends jspb.Message {
    getType(): string

    setType(value: string): void

    getNonce(): string

    setNonce(value: string): void

    getGasprice(): string

    setGasprice(value: string): void

    getGas(): string

    setGas(value: string): void

    getValue(): string

    setValue(value: string): void

    getInput(): string

    setInput(value: string): void

    getV(): string

    setV(value: string): void

    getR(): string

    setR(value: string): void

    getS(): string

    setS(value: string): void

    getTo(): string

    setTo(value: string): void

    getHash(): string

    setHash(value: string): void

    getFrom(): string

    setFrom(value: string): void

    getMaxfeepergas(): string

    setMaxfeepergas(value: string): void

    getMaxpriorityfeepergas(): string

    setMaxpriorityfeepergas(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): EthTransaction.AsObject

    static toObject(includeInstance: boolean, msg: EthTransaction): EthTransaction.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: EthTransaction, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): EthTransaction

    static deserializeBinaryFromReader(message: EthTransaction, reader: jspb.BinaryReader): EthTransaction
  }

  export namespace EthTransaction {
    export type AsObject = {
      type: string
      nonce: string
      gasprice: string
      gas: string
      value: string
      input: string
      v: string
      r: string
      s: string
      to: string
      hash: string
      from: string
      maxfeepergas: string
      maxpriorityfeepergas: string
    }
  }

  export class Log extends jspb.Message {
    getAddress(): string

    setAddress(value: string): void

    clearTopicsList(): void

    getTopicsList(): Array<string>

    setTopicsList(value: Array<string>): void

    addTopics(value: string, index?: number): string

    getData(): string

    setData(value: string): void

    getBlocknumber(): string

    setBlocknumber(value: string): void

    getTransactionhash(): string

    setTransactionhash(value: string): void

    getTransactionindex(): string

    setTransactionindex(value: string): void

    getBlockhash(): string

    setBlockhash(value: string): void

    getLogindex(): string

    setLogindex(value: string): void

    getRemoved(): boolean

    setRemoved(value: boolean): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): Log.AsObject

    static toObject(includeInstance: boolean, msg: Log): Log.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: Log, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): Log

    static deserializeBinaryFromReader(message: Log, reader: jspb.BinaryReader): Log
  }

  export namespace Log {
    export type AsObject = {
      address: string
      topicsList: Array<string>
      data: string
      blocknumber: string
      transactionhash: string
      transactionindex: string
      blockhash: string
      logindex: string
      removed: boolean
    }
  }

  export class EthReceipt extends jspb.Message {
    getRoot(): string

    setRoot(value: string): void

    getStatus(): string

    setStatus(value: string): void

    getCumulativegasused(): string

    setCumulativegasused(value: string): void

    getLogsbloom(): string

    setLogsbloom(value: string): void

    clearLogsList(): void

    getLogsList(): Array<TransactionEvent.Log>

    setLogsList(value: Array<TransactionEvent.Log>): void

    addLogs(value?: TransactionEvent.Log, index?: number): TransactionEvent.Log

    getTransactionhash(): string

    setTransactionhash(value: string): void

    getContractaddress(): string

    setContractaddress(value: string): void

    getGasused(): string

    setGasused(value: string): void

    getBlockhash(): string

    setBlockhash(value: string): void

    getBlocknumber(): string

    setBlocknumber(value: string): void

    getTransactionindex(): string

    setTransactionindex(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): EthReceipt.AsObject

    static toObject(includeInstance: boolean, msg: EthReceipt): EthReceipt.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: EthReceipt, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): EthReceipt

    static deserializeBinaryFromReader(message: EthReceipt, reader: jspb.BinaryReader): EthReceipt
  }

  export namespace EthReceipt {
    export type AsObject = {
      root: string
      status: string
      cumulativegasused: string
      logsbloom: string
      logsList: Array<TransactionEvent.Log.AsObject>
      transactionhash: string
      contractaddress: string
      gasused: string
      blockhash: string
      blocknumber: string
      transactionindex: string
    }
  }

  export class TraceAction extends jspb.Message {
    getCalltype(): string

    setCalltype(value: string): void

    getTo(): string

    setTo(value: string): void

    getInput(): string

    setInput(value: string): void

    getFrom(): string

    setFrom(value: string): void

    getValue(): string

    setValue(value: string): void

    getInit(): string

    setInit(value: string): void

    getAddress(): string

    setAddress(value: string): void

    getBalance(): string

    setBalance(value: string): void

    getRefundaddress(): string

    setRefundaddress(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): TraceAction.AsObject

    static toObject(includeInstance: boolean, msg: TraceAction): TraceAction.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: TraceAction, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): TraceAction

    static deserializeBinaryFromReader(message: TraceAction, reader: jspb.BinaryReader): TraceAction
  }

  export namespace TraceAction {
    export type AsObject = {
      calltype: string
      to: string
      input: string
      from: string
      value: string
      init: string
      address: string
      balance: string
      refundaddress: string
    }
  }

  export class TraceResult extends jspb.Message {
    getGasused(): string

    setGasused(value: string): void

    getAddress(): string

    setAddress(value: string): void

    getCode(): string

    setCode(value: string): void

    getOutput(): string

    setOutput(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): TraceResult.AsObject

    static toObject(includeInstance: boolean, msg: TraceResult): TraceResult.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: TraceResult, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): TraceResult

    static deserializeBinaryFromReader(message: TraceResult, reader: jspb.BinaryReader): TraceResult
  }

  export namespace TraceResult {
    export type AsObject = {
      gasused: string
      address: string
      code: string
      output: string
    }
  }

  export class Trace extends jspb.Message {
    hasAction(): boolean

    clearAction(): void

    getAction(): TransactionEvent.TraceAction | undefined

    setAction(value?: TransactionEvent.TraceAction): void

    getBlockhash(): string

    setBlockhash(value: string): void

    getBlocknumber(): number

    setBlocknumber(value: number): void

    hasResult(): boolean

    clearResult(): void

    getResult(): TransactionEvent.TraceResult | undefined

    setResult(value?: TransactionEvent.TraceResult): void

    getSubtraces(): number

    setSubtraces(value: number): void

    clearTraceaddressList(): void

    getTraceaddressList(): Array<number>

    setTraceaddressList(value: Array<number>): void

    addTraceaddress(value: number, index?: number): number

    getTransactionhash(): string

    setTransactionhash(value: string): void

    getTransactionposition(): number

    setTransactionposition(value: number): void

    getType(): string

    setType(value: string): void

    getError(): string

    setError(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): Trace.AsObject

    static toObject(includeInstance: boolean, msg: Trace): Trace.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: Trace, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): Trace

    static deserializeBinaryFromReader(message: Trace, reader: jspb.BinaryReader): Trace
  }

  export namespace Trace {
    export type AsObject = {
      action?: TransactionEvent.TraceAction.AsObject
      blockhash: string
      blocknumber: number
      result?: TransactionEvent.TraceResult.AsObject
      subtraces: number
      traceaddressList: Array<number>
      transactionhash: string
      transactionposition: number
      type: string
      error: string
    }
  }

  export interface EventTypeMap {
    BLOCK: 0
    REORG: 1
  }

  export const EventType: EventTypeMap
}

export class AlertEvent extends jspb.Message {
  hasAlert(): boolean

  clearAlert(): void

  getAlert(): AlertEvent.Alert | undefined

  setAlert(value?: AlertEvent.Alert): void

  hasTimestamps(): boolean

  clearTimestamps(): void

  getTimestamps(): alert_pb.TrackingTimestamps | undefined

  setTimestamps(value?: alert_pb.TrackingTimestamps): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): AlertEvent.AsObject

  static toObject(includeInstance: boolean, msg: AlertEvent): AlertEvent.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: AlertEvent, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): AlertEvent

  static deserializeBinaryFromReader(message: AlertEvent, reader: jspb.BinaryReader): AlertEvent
}

export namespace AlertEvent {
  export type AsObject = {
    alert?: AlertEvent.Alert.AsObject
    timestamps?: alert_pb.TrackingTimestamps.AsObject
  }

  export class Alert extends jspb.Message {
    getAlertid(): string

    setAlertid(value: string): void

    clearAddressesList(): void

    getAddressesList(): Array<string>

    setAddressesList(value: Array<string>): void

    addAddresses(value: string, index?: number): string

    clearContractsList(): void

    getContractsList(): Array<AlertEvent.Alert.Contract>

    setContractsList(value: Array<AlertEvent.Alert.Contract>): void

    addContracts(value?: AlertEvent.Alert.Contract, index?: number): AlertEvent.Alert.Contract

    getCreatedat(): string

    setCreatedat(value: string): void

    getDescription(): string

    setDescription(value: string): void

    getHash(): string

    setHash(value: string): void

    getMetadataMap(): jspb.Map<string, string>

    clearMetadataMap(): void

    getName(): string

    setName(value: string): void

    clearProjectsList(): void

    getProjectsList(): Array<AlertEvent.Alert.Project>

    setProjectsList(value: Array<AlertEvent.Alert.Project>): void

    addProjects(value?: AlertEvent.Alert.Project, index?: number): AlertEvent.Alert.Project

    getScannodecount(): number

    setScannodecount(value: number): void

    getSeverity(): string

    setSeverity(value: string): void

    hasSource(): boolean

    clearSource(): void

    getSource(): AlertEvent.Alert.Source | undefined

    setSource(value?: AlertEvent.Alert.Source): void

    getFindingtype(): string

    setFindingtype(value: string): void

    clearRelatedalertsList(): void

    getRelatedalertsList(): Array<string>

    setRelatedalertsList(value: Array<string>): void

    addRelatedalerts(value: string, index?: number): string

    getChainid(): number

    setChainid(value: number): void

    clearLabelsList(): void

    getLabelsList(): Array<AlertEvent.Alert.Label>

    setLabelsList(value: Array<AlertEvent.Alert.Label>): void

    addLabels(value?: AlertEvent.Alert.Label, index?: number): AlertEvent.Alert.Label

    getTruncated(): boolean

    setTruncated(value: boolean): void

    hasAddressbloomfilter(): boolean

    clearAddressbloomfilter(): void

    getAddressbloomfilter(): alert_pb.BloomFilter | undefined

    setAddressbloomfilter(value?: alert_pb.BloomFilter): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): Alert.AsObject

    static toObject(includeInstance: boolean, msg: Alert): Alert.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: Alert, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): Alert

    static deserializeBinaryFromReader(message: Alert, reader: jspb.BinaryReader): Alert
  }

  export namespace Alert {
    export type AsObject = {
      alertid: string
      addressesList: Array<string>
      contractsList: Array<AlertEvent.Alert.Contract.AsObject>
      createdat: string
      description: string
      hash: string
      metadataMap: Array<[string, string]>
      name: string
      projectsList: Array<AlertEvent.Alert.Project.AsObject>
      scannodecount: number
      severity: string
      source?: AlertEvent.Alert.Source.AsObject
      findingtype: string
      relatedalertsList: Array<string>
      chainid: number
      labelsList: Array<AlertEvent.Alert.Label.AsObject>
      truncated: boolean
      addressbloomfilter?: alert_pb.BloomFilter.AsObject
    }

    export class Contract extends jspb.Message {
      getName(): string

      setName(value: string): void

      getProjectid(): string

      setProjectid(value: string): void

      serializeBinary(): Uint8Array

      toObject(includeInstance?: boolean): Contract.AsObject

      static toObject(includeInstance: boolean, msg: Contract): Contract.AsObject

      static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
      static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

      static serializeBinaryToWriter(message: Contract, writer: jspb.BinaryWriter): void

      static deserializeBinary(bytes: Uint8Array): Contract

      static deserializeBinaryFromReader(message: Contract, reader: jspb.BinaryReader): Contract
    }

    export namespace Contract {
      export type AsObject = {
        name: string
        projectid: string
      }
    }

    export class Project extends jspb.Message {
      getId(): string

      setId(value: string): void

      serializeBinary(): Uint8Array

      toObject(includeInstance?: boolean): Project.AsObject

      static toObject(includeInstance: boolean, msg: Project): Project.AsObject

      static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
      static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

      static serializeBinaryToWriter(message: Project, writer: jspb.BinaryWriter): void

      static deserializeBinary(bytes: Uint8Array): Project

      static deserializeBinaryFromReader(message: Project, reader: jspb.BinaryReader): Project
    }

    export namespace Project {
      export type AsObject = {
        id: string
      }
    }

    export class Block extends jspb.Message {
      getNumber(): number

      setNumber(value: number): void

      getHash(): string

      setHash(value: string): void

      getTimestamp(): string

      setTimestamp(value: string): void

      getChainid(): number

      setChainid(value: number): void

      serializeBinary(): Uint8Array

      toObject(includeInstance?: boolean): Block.AsObject

      static toObject(includeInstance: boolean, msg: Block): Block.AsObject

      static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
      static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

      static serializeBinaryToWriter(message: Block, writer: jspb.BinaryWriter): void

      static deserializeBinary(bytes: Uint8Array): Block

      static deserializeBinaryFromReader(message: Block, reader: jspb.BinaryReader): Block
    }

    export namespace Block {
      export type AsObject = {
        number: number
        hash: string
        timestamp: string
        chainid: number
      }
    }

    export class Bot extends jspb.Message {
      clearChainidsList(): void

      getChainidsList(): Array<string>

      setChainidsList(value: Array<string>): void

      addChainids(value: string, index?: number): string

      getCreatedat(): string

      setCreatedat(value: string): void

      getDescription(): string

      setDescription(value: string): void

      getDeveloper(): string

      setDeveloper(value: string): void

      getDocreference(): string

      setDocreference(value: string): void

      getEnabled(): boolean

      setEnabled(value: boolean): void

      getId(): string

      setId(value: string): void

      getImage(): string

      setImage(value: string): void

      getName(): string

      setName(value: string): void

      getReference(): string

      setReference(value: string): void

      getRepository(): string

      setRepository(value: string): void

      clearProjectsList(): void

      getProjectsList(): Array<string>

      setProjectsList(value: Array<string>): void

      addProjects(value: string, index?: number): string

      clearScannodesList(): void

      getScannodesList(): Array<string>

      setScannodesList(value: Array<string>): void

      addScannodes(value: string, index?: number): string

      getVersion(): string

      setVersion(value: string): void

      serializeBinary(): Uint8Array

      toObject(includeInstance?: boolean): Bot.AsObject

      static toObject(includeInstance: boolean, msg: Bot): Bot.AsObject

      static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
      static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

      static serializeBinaryToWriter(message: Bot, writer: jspb.BinaryWriter): void

      static deserializeBinary(bytes: Uint8Array): Bot

      static deserializeBinaryFromReader(message: Bot, reader: jspb.BinaryReader): Bot
    }

    export namespace Bot {
      export type AsObject = {
        chainidsList: Array<string>
        createdat: string
        description: string
        developer: string
        docreference: string
        enabled: boolean
        id: string
        image: string
        name: string
        reference: string
        repository: string
        projectsList: Array<string>
        scannodesList: Array<string>
        version: string
      }
    }

    export class SourceAlertEvent extends jspb.Message {
      getBotid(): string

      setBotid(value: string): void

      getHash(): string

      setHash(value: string): void

      getTimestamp(): string

      setTimestamp(value: string): void

      getChainid(): number

      setChainid(value: number): void

      serializeBinary(): Uint8Array

      toObject(includeInstance?: boolean): SourceAlertEvent.AsObject

      static toObject(includeInstance: boolean, msg: SourceAlertEvent): SourceAlertEvent.AsObject

      static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
      static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

      static serializeBinaryToWriter(message: SourceAlertEvent, writer: jspb.BinaryWriter): void

      static deserializeBinary(bytes: Uint8Array): SourceAlertEvent

      static deserializeBinaryFromReader(message: SourceAlertEvent, reader: jspb.BinaryReader): SourceAlertEvent
    }

    export namespace SourceAlertEvent {
      export type AsObject = {
        botid: string
        hash: string
        timestamp: string
        chainid: number
      }
    }

    export class Source extends jspb.Message {
      getTransactionhash(): string

      setTransactionhash(value: string): void

      hasBot(): boolean

      clearBot(): void

      getBot(): AlertEvent.Alert.Bot | undefined

      setBot(value?: AlertEvent.Alert.Bot): void

      hasBlock(): boolean

      clearBlock(): void

      getBlock(): AlertEvent.Alert.Block | undefined

      setBlock(value?: AlertEvent.Alert.Block): void

      hasSourcealert(): boolean

      clearSourcealert(): void

      getSourcealert(): AlertEvent.Alert.SourceAlertEvent | undefined

      setSourcealert(value?: AlertEvent.Alert.SourceAlertEvent): void

      serializeBinary(): Uint8Array

      toObject(includeInstance?: boolean): Source.AsObject

      static toObject(includeInstance: boolean, msg: Source): Source.AsObject

      static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
      static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

      static serializeBinaryToWriter(message: Source, writer: jspb.BinaryWriter): void

      static deserializeBinary(bytes: Uint8Array): Source

      static deserializeBinaryFromReader(message: Source, reader: jspb.BinaryReader): Source
    }

    export namespace Source {
      export type AsObject = {
        transactionhash: string
        bot?: AlertEvent.Alert.Bot.AsObject
        block?: AlertEvent.Alert.Block.AsObject
        sourcealert?: AlertEvent.Alert.SourceAlertEvent.AsObject
      }
    }

    export class Label extends jspb.Message {
      getLabel(): string

      setLabel(value: string): void

      getConfidence(): number

      setConfidence(value: number): void

      getEntity(): string

      setEntity(value: string): void

      getEntitytype(): string

      setEntitytype(value: string): void

      getRemove(): boolean

      setRemove(value: boolean): void

      clearMetadataList(): void

      getMetadataList(): Array<string>

      setMetadataList(value: Array<string>): void

      addMetadata(value: string, index?: number): string

      getUniquekey(): string

      setUniquekey(value: string): void

      serializeBinary(): Uint8Array

      toObject(includeInstance?: boolean): Label.AsObject

      static toObject(includeInstance: boolean, msg: Label): Label.AsObject

      static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
      static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

      static serializeBinaryToWriter(message: Label, writer: jspb.BinaryWriter): void

      static deserializeBinary(bytes: Uint8Array): Label

      static deserializeBinaryFromReader(message: Label, reader: jspb.BinaryReader): Label
    }

    export namespace Label {
      export type AsObject = {
        label: string
        confidence: number
        entity: string
        entitytype: string
        remove: boolean
        metadataList: Array<string>
        uniquekey: string
      }
    }
  }
}

export interface ResponseStatusMap {
  UNKNOWN: 0
  ERROR: 1
  SUCCESS: 2
}

export const ResponseStatus: ResponseStatusMap
