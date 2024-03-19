// package: network.forta
// file: alert.proto

import * as jspb from 'google-protobuf'

export class TrackingTimestamps extends jspb.Message {
  getBlock(): string

  setBlock(value: string): void

  getFeed(): string

  setFeed(value: string): void

  getBotrequest(): string

  setBotrequest(value: string): void

  getBotresponse(): string

  setBotresponse(value: string): void

  getSourcealert(): string

  setSourcealert(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): TrackingTimestamps.AsObject

  static toObject(includeInstance: boolean, msg: TrackingTimestamps): TrackingTimestamps.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: TrackingTimestamps, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): TrackingTimestamps

  static deserializeBinaryFromReader(message: TrackingTimestamps, reader: jspb.BinaryReader): TrackingTimestamps
}

export namespace TrackingTimestamps {
  export type AsObject = {
    block: string
    feed: string
    botrequest: string
    botresponse: string
    sourcealert: string
  }
}

export class AgentInfo extends jspb.Message {
  getImage(): string

  setImage(value: string): void

  getImagehash(): string

  setImagehash(value: string): void

  getId(): string

  setId(value: string): void

  getIstest(): boolean

  setIstest(value: boolean): void

  getManifest(): string

  setManifest(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): AgentInfo.AsObject

  static toObject(includeInstance: boolean, msg: AgentInfo): AgentInfo.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: AgentInfo, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): AgentInfo

  static deserializeBinaryFromReader(message: AgentInfo, reader: jspb.BinaryReader): AgentInfo
}

export namespace AgentInfo {
  export type AsObject = {
    image: string
    imagehash: string
    id: string
    istest: boolean
    manifest: string
  }
}

export class ScannerInfo extends jspb.Message {
  getAddress(): string

  setAddress(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): ScannerInfo.AsObject

  static toObject(includeInstance: boolean, msg: ScannerInfo): ScannerInfo.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: ScannerInfo, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): ScannerInfo

  static deserializeBinaryFromReader(message: ScannerInfo, reader: jspb.BinaryReader): ScannerInfo
}

export namespace ScannerInfo {
  export type AsObject = {
    address: string
  }
}

export class AlertResponse extends jspb.Message {
  clearAlertsList(): void

  getAlertsList(): Array<SignedAlert>

  setAlertsList(value: Array<SignedAlert>): void

  addAlerts(value?: SignedAlert, index?: number): SignedAlert

  getNextpagetoken(): string

  setNextpagetoken(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): AlertResponse.AsObject

  static toObject(includeInstance: boolean, msg: AlertResponse): AlertResponse.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: AlertResponse, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): AlertResponse

  static deserializeBinaryFromReader(message: AlertResponse, reader: jspb.BinaryReader): AlertResponse
}

export namespace AlertResponse {
  export type AsObject = {
    alertsList: Array<SignedAlert.AsObject>
    nextpagetoken: string
  }
}

export class Signature extends jspb.Message {
  getSignature(): string

  setSignature(value: string): void

  getAlgorithm(): string

  setAlgorithm(value: string): void

  getSigner(): string

  setSigner(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): Signature.AsObject

  static toObject(includeInstance: boolean, msg: Signature): Signature.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: Signature, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): Signature

  static deserializeBinaryFromReader(message: Signature, reader: jspb.BinaryReader): Signature
}

export namespace Signature {
  export type AsObject = {
    signature: string
    algorithm: string
    signer: string
  }
}

export class BloomFilter extends jspb.Message {
  getK(): string

  setK(value: string): void

  getM(): string

  setM(value: string): void

  getBitset(): string

  setBitset(value: string): void

  getItemcount(): number

  setItemcount(value: number): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): BloomFilter.AsObject

  static toObject(includeInstance: boolean, msg: BloomFilter): BloomFilter.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: BloomFilter, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): BloomFilter

  static deserializeBinaryFromReader(message: BloomFilter, reader: jspb.BinaryReader): BloomFilter
}

export namespace BloomFilter {
  export type AsObject = {
    k: string
    m: string
    bitset: string
    itemcount: number
  }
}

export class Alert extends jspb.Message {
  getId(): string

  setId(value: string): void

  getType(): AlertTypeMap[keyof AlertTypeMap]

  setType(value: AlertTypeMap[keyof AlertTypeMap]): void

  hasFinding(): boolean

  clearFinding(): void

  getFinding(): Finding | undefined

  setFinding(value?: Finding): void

  getTimestamp(): string

  setTimestamp(value: string): void

  getMetadataMap(): jspb.Map<string, string>

  clearMetadataMap(): void

  hasAgent(): boolean

  clearAgent(): void

  getAgent(): AgentInfo | undefined

  setAgent(value?: AgentInfo): void

  getTagsMap(): jspb.Map<string, string>

  clearTagsMap(): void

  hasScanner(): boolean

  clearScanner(): void

  getScanner(): ScannerInfo | undefined

  setScanner(value?: ScannerInfo): void

  hasTimestamps(): boolean

  clearTimestamps(): void

  getTimestamps(): TrackingTimestamps | undefined

  setTimestamps(value?: TrackingTimestamps): void

  getTruncated(): boolean

  setTruncated(value: boolean): void

  hasAddressbloomfilter(): boolean

  clearAddressbloomfilter(): void

  getAddressbloomfilter(): BloomFilter | undefined

  setAddressbloomfilter(value?: BloomFilter): void

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
    id: string
    type: AlertTypeMap[keyof AlertTypeMap]
    finding?: Finding.AsObject
    timestamp: string
    metadataMap: Array<[string, string]>
    agent?: AgentInfo.AsObject
    tagsMap: Array<[string, string]>
    scanner?: ScannerInfo.AsObject
    timestamps?: TrackingTimestamps.AsObject
    truncated: boolean
    addressbloomfilter?: BloomFilter.AsObject
  }
}

export class SignedAlert extends jspb.Message {
  hasAlert(): boolean

  clearAlert(): void

  getAlert(): Alert | undefined

  setAlert(value?: Alert): void

  hasSignature(): boolean

  clearSignature(): void

  getSignature(): Signature | undefined

  setSignature(value?: Signature): void

  getChainid(): string

  setChainid(value: string): void

  getBlocknumber(): string

  setBlocknumber(value: string): void

  getPublishedwithtx(): string

  setPublishedwithtx(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): SignedAlert.AsObject

  static toObject(includeInstance: boolean, msg: SignedAlert): SignedAlert.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: SignedAlert, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): SignedAlert

  static deserializeBinaryFromReader(message: SignedAlert, reader: jspb.BinaryReader): SignedAlert
}

export namespace SignedAlert {
  export type AsObject = {
    alert?: Alert.AsObject
    signature?: Signature.AsObject
    chainid: string
    blocknumber: string
    publishedwithtx: string
  }
}

export class Label extends jspb.Message {
  getEntitytype(): Label.EntityTypeMap[keyof Label.EntityTypeMap]

  setEntitytype(value: Label.EntityTypeMap[keyof Label.EntityTypeMap]): void

  getEntity(): string

  setEntity(value: string): void

  getConfidence(): number

  setConfidence(value: number): void

  getRemove(): boolean

  setRemove(value: boolean): void

  getLabel(): string

  setLabel(value: string): void

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
    entitytype: Label.EntityTypeMap[keyof Label.EntityTypeMap]
    entity: string
    confidence: number
    remove: boolean
    label: string
    metadataList: Array<string>
    uniquekey: string
  }

  export interface EntityTypeMap {
    UNKNOWN_ENTITY_TYPE: 0
    ADDRESS: 1
    TRANSACTION: 2
    BLOCK: 3
    URL: 4
  }

  export const EntityType: EntityTypeMap
}

export class Source extends jspb.Message {
  clearTransactionsList(): void

  getTransactionsList(): Array<Source.TransactionSource>

  setTransactionsList(value: Array<Source.TransactionSource>): void

  addTransactions(value?: Source.TransactionSource, index?: number): Source.TransactionSource

  clearBlocksList(): void

  getBlocksList(): Array<Source.BlockSource>

  setBlocksList(value: Array<Source.BlockSource>): void

  addBlocks(value?: Source.BlockSource, index?: number): Source.BlockSource

  clearUrlsList(): void

  getUrlsList(): Array<Source.URLSource>

  setUrlsList(value: Array<Source.URLSource>): void

  addUrls(value?: Source.URLSource, index?: number): Source.URLSource

  clearChainsList(): void

  getChainsList(): Array<Source.ChainSource>

  setChainsList(value: Array<Source.ChainSource>): void

  addChains(value?: Source.ChainSource, index?: number): Source.ChainSource

  clearAlertsList(): void

  getAlertsList(): Array<Source.AlertSource>

  setAlertsList(value: Array<Source.AlertSource>): void

  addAlerts(value?: Source.AlertSource, index?: number): Source.AlertSource

  clearCustomsourcesList(): void

  getCustomsourcesList(): Array<Source.CustomSource>

  setCustomsourcesList(value: Array<Source.CustomSource>): void

  addCustomsources(value?: Source.CustomSource, index?: number): Source.CustomSource

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
    transactionsList: Array<Source.TransactionSource.AsObject>
    blocksList: Array<Source.BlockSource.AsObject>
    urlsList: Array<Source.URLSource.AsObject>
    chainsList: Array<Source.ChainSource.AsObject>
    alertsList: Array<Source.AlertSource.AsObject>
    customsourcesList: Array<Source.CustomSource.AsObject>
  }

  export class TransactionSource extends jspb.Message {
    getChainid(): number

    setChainid(value: number): void

    getHash(): string

    setHash(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): TransactionSource.AsObject

    static toObject(includeInstance: boolean, msg: TransactionSource): TransactionSource.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: TransactionSource, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): TransactionSource

    static deserializeBinaryFromReader(message: TransactionSource, reader: jspb.BinaryReader): TransactionSource
  }

  export namespace TransactionSource {
    export type AsObject = {
      chainid: number
      hash: string
    }
  }

  export class BlockSource extends jspb.Message {
    getChainid(): number

    setChainid(value: number): void

    getHash(): string

    setHash(value: string): void

    getNumber(): number

    setNumber(value: number): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): BlockSource.AsObject

    static toObject(includeInstance: boolean, msg: BlockSource): BlockSource.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: BlockSource, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): BlockSource

    static deserializeBinaryFromReader(message: BlockSource, reader: jspb.BinaryReader): BlockSource
  }

  export namespace BlockSource {
    export type AsObject = {
      chainid: number
      hash: string
      number: number
    }
  }

  export class URLSource extends jspb.Message {
    getUrl(): string

    setUrl(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): URLSource.AsObject

    static toObject(includeInstance: boolean, msg: URLSource): URLSource.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: URLSource, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): URLSource

    static deserializeBinaryFromReader(message: URLSource, reader: jspb.BinaryReader): URLSource
  }

  export namespace URLSource {
    export type AsObject = {
      url: string
    }
  }

  export class ChainSource extends jspb.Message {
    getChainid(): number

    setChainid(value: number): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): ChainSource.AsObject

    static toObject(includeInstance: boolean, msg: ChainSource): ChainSource.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: ChainSource, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): ChainSource

    static deserializeBinaryFromReader(message: ChainSource, reader: jspb.BinaryReader): ChainSource
  }

  export namespace ChainSource {
    export type AsObject = {
      chainid: number
    }
  }

  export class AlertSource extends jspb.Message {
    getId(): string

    setId(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): AlertSource.AsObject

    static toObject(includeInstance: boolean, msg: AlertSource): AlertSource.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: AlertSource, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): AlertSource

    static deserializeBinaryFromReader(message: AlertSource, reader: jspb.BinaryReader): AlertSource
  }

  export namespace AlertSource {
    export type AsObject = {
      id: string
    }
  }

  export class CustomSource extends jspb.Message {
    getName(): string

    setName(value: string): void

    getValue(): string

    setValue(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): CustomSource.AsObject

    static toObject(includeInstance: boolean, msg: CustomSource): CustomSource.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: CustomSource, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): CustomSource

    static deserializeBinaryFromReader(message: CustomSource, reader: jspb.BinaryReader): CustomSource
  }

  export namespace CustomSource {
    export type AsObject = {
      name: string
      value: string
    }
  }
}

export class Finding extends jspb.Message {
  getProtocol(): string

  setProtocol(value: string): void

  getSeverity(): Finding.SeverityMap[keyof Finding.SeverityMap]

  setSeverity(value: Finding.SeverityMap[keyof Finding.SeverityMap]): void

  getMetadataMap(): jspb.Map<string, string>

  clearMetadataMap(): void

  getType(): Finding.FindingTypeMap[keyof Finding.FindingTypeMap]

  setType(value: Finding.FindingTypeMap[keyof Finding.FindingTypeMap]): void

  getAlertid(): string

  setAlertid(value: string): void

  getName(): string

  setName(value: string): void

  getDescription(): string

  setDescription(value: string): void

  getPrivate(): boolean

  setPrivate(value: boolean): void

  clearAddressesList(): void

  getAddressesList(): Array<string>

  setAddressesList(value: Array<string>): void

  addAddresses(value: string, index?: number): string

  getIndicatorsMap(): jspb.Map<string, number>

  clearIndicatorsMap(): void

  clearLabelsList(): void

  getLabelsList(): Array<Label>

  setLabelsList(value: Array<Label>): void

  addLabels(value?: Label, index?: number): Label

  clearRelatedalertsList(): void

  getRelatedalertsList(): Array<string>

  setRelatedalertsList(value: Array<string>): void

  addRelatedalerts(value: string, index?: number): string

  getUniquekey(): string

  setUniquekey(value: string): void

  hasSource(): boolean

  clearSource(): void

  getSource(): Source | undefined

  setSource(value?: Source): void

  getTimestamp(): string

  setTimestamp(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): Finding.AsObject

  static toObject(includeInstance: boolean, msg: Finding): Finding.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: Finding, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): Finding

  static deserializeBinaryFromReader(message: Finding, reader: jspb.BinaryReader): Finding
}

export namespace Finding {
  export type AsObject = {
    protocol: string
    severity: Finding.SeverityMap[keyof Finding.SeverityMap]
    metadataMap: Array<[string, string]>
    type: Finding.FindingTypeMap[keyof Finding.FindingTypeMap]
    alertid: string
    name: string
    description: string
    pb_private: boolean
    addressesList: Array<string>
    indicatorsMap: Array<[string, number]>
    labelsList: Array<Label.AsObject>
    relatedalertsList: Array<string>
    uniquekey: string
    source?: Source.AsObject
    timestamp: string
  }

  export interface SeverityMap {
    UNKNOWN: 0
    INFO: 1
    LOW: 2
    MEDIUM: 3
    HIGH: 4
    CRITICAL: 5
  }

  export const Severity: SeverityMap

  export interface FindingTypeMap {
    UNKNOWN_TYPE: 0
    EXPLOIT: 1
    SUSPICIOUS: 2
    DEGRADED: 3
    INFORMATION: 4
    SCAM: 5
  }

  export const FindingType: FindingTypeMap
}

export class APIAlert extends jspb.Message {
  getId(): string

  setId(value: string): void

  getType(): AlertTypeMap[keyof AlertTypeMap]

  setType(value: AlertTypeMap[keyof AlertTypeMap]): void

  hasFinding(): boolean

  clearFinding(): void

  getFinding(): Finding | undefined

  setFinding(value?: Finding): void

  hasAgent(): boolean

  clearAgent(): void

  getAgent(): APIAlert.APIAlertAgent | undefined

  setAgent(value?: APIAlert.APIAlertAgent): void

  getTimestamp(): string

  setTimestamp(value: string): void

  serializeBinary(): Uint8Array

  toObject(includeInstance?: boolean): APIAlert.AsObject

  static toObject(includeInstance: boolean, msg: APIAlert): APIAlert.AsObject

  static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
  static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

  static serializeBinaryToWriter(message: APIAlert, writer: jspb.BinaryWriter): void

  static deserializeBinary(bytes: Uint8Array): APIAlert

  static deserializeBinaryFromReader(message: APIAlert, reader: jspb.BinaryReader): APIAlert
}

export namespace APIAlert {
  export type AsObject = {
    id: string
    type: AlertTypeMap[keyof AlertTypeMap]
    finding?: Finding.AsObject
    agent?: APIAlert.APIAlertAgent.AsObject
    timestamp: string
  }

  export class APIAlertAgent extends jspb.Message {
    getId(): string

    setId(value: string): void

    serializeBinary(): Uint8Array

    toObject(includeInstance?: boolean): APIAlertAgent.AsObject

    static toObject(includeInstance: boolean, msg: APIAlertAgent): APIAlertAgent.AsObject

    static extensions: { [key: number]: jspb.ExtensionFieldInfo<jspb.Message> }
    static extensionsBinary: { [key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message> }

    static serializeBinaryToWriter(message: APIAlertAgent, writer: jspb.BinaryWriter): void

    static deserializeBinary(bytes: Uint8Array): APIAlertAgent

    static deserializeBinaryFromReader(message: APIAlertAgent, reader: jspb.BinaryReader): APIAlertAgent
  }

  export namespace APIAlertAgent {
    export type AsObject = {
      id: string
    }
  }
}

export interface AlertTypeMap {
  UNKNOWN_ALERT_TYPE: 0
  TRANSACTION: 1
  BLOCK: 2
  PRIVATE: 3
  COMBINATION: 4
  API: 5
}

export const AlertType: AlertTypeMap
