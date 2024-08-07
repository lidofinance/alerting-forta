import BigNumber from 'bignumber.js'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { StorageArrayResponse, StorageItemResponse, StorageSlot } from '../../entity/storage_slot'
import { Finding } from '../../generated/proto/alert_pb'
import { networkAlert } from '../../utils/errors'
import { elapsedTime } from '../../utils/time'

export abstract class IStorageWatcherClient {
  public abstract getStorageBySlotName(
    address: string,
    slotId: number,
    slotName: string,
    blockTag: string,
  ): Promise<E.Either<Error, StorageItemResponse>>

  public abstract getStorageAtSlotAddr(
    address: string,
    slotId: number,
    slotAddr: string,
    blockTag: string,
  ): Promise<E.Either<Error, StorageItemResponse>>

  public abstract getStorageArrayAtSlotAddr(
    address: string,
    slotId: number,
    slotAddr: string,
    blockTag: string,
    len: number,
  ): Promise<E.Either<Error, StorageArrayResponse>>
}

export class StorageWatcherSrv {
  private readonly logger: Logger
  private readonly storageSlots: Map<number, StorageSlot>
  private readonly client: IStorageWatcherClient
  private readonly cacheItemValue: Map<number, string>
  private readonly cacheItemValues: Map<number, string[]>

  constructor(logger: Logger, storageSlots: StorageSlot[], client: IStorageWatcherClient) {
    this.logger = logger
    this.storageSlots = new Map<number, StorageSlot>()
    this.client = client

    this.cacheItemValue = new Map<number, string>()
    this.cacheItemValues = new Map<number, string[]>()

    for (const slot of storageSlots) {
      if (slot.isArray) {
        this.cacheItemValues.set(slot.id, [])
      } else {
        this.cacheItemValue.set(slot.id, '')
      }

      this.storageSlots.set(slot.id, slot)
    }
  }

  public async initialize(blockHash: string): Promise<Error | null> {
    const start = new Date().getTime()

    const promises = []
    const promisesArray = []

    for (const [slotId, slot] of this.storageSlots) {
      if (!slot.isAddress) {
        promises.push(this.client.getStorageBySlotName(slot.contractAddress, slotId, slot.slotName, blockHash))
      }

      if (slot.isAddress && !slot.isArray) {
        // @ts-ignore
        promises.push(this.client.getStorageAtSlotAddr(slot.contractAddress, slotId, slot.slotAddress, blockHash))
      }

      if (slot.isAddress && slot.isArray) {
        // @ts-ignore
        const len = await this.client.getStorageAtSlotAddr(slot.contractAddress, slot.id, slot.slotAddress, blockHash)
        if (E.isLeft(len)) {
          return new Error(`Could not init StorageWatcher: ${len.left}`)
        }

        promisesArray.push(
          this.client.getStorageArrayAtSlotAddr(
            slot.contractAddress,
            slot.id,
            // @ts-ignore
            slot.slotAddress,
            blockHash,
            new BigNumber(len.right.value).toNumber(),
          ),
        )
      }
    }

    let responsesRaw: E.Either<Error, StorageItemResponse>[] = []
    try {
      responsesRaw = await Promise.all(promises)
    } catch (e) {
      return new Error(`Could not init StorageWatcher: ${e}`)
    }

    for (const resp of responsesRaw) {
      if (E.isLeft(resp)) {
        return new Error(`Could not init StorageWatcher: ${resp.left}`)
      }

      this.cacheItemValue.set(resp.right.slotId, resp.right.value)
    }

    let responsesArraysRaw: E.Either<Error, StorageArrayResponse>[] = []
    try {
      responsesArraysRaw = await Promise.all(promisesArray)
    } catch (e) {
      return new Error(`Could not init StorageWatcher: ${e}`)
    }

    for (const resp of responsesArraysRaw) {
      if (E.isLeft(resp)) {
        return new Error(`Could not init StorageWatcher: ${resp.left}`)
      }

      this.cacheItemValues.set(resp.right.slotId, resp.right.values)
    }

    this.logger.info(elapsedTime(`[${StorageWatcherSrv.name}.initialize]`, start))

    return null
  }

  public async handleBlock(blockHash: string): Promise<Finding[]> {
    const start = new Date().getTime()

    const promises = []
    const promisesArray = []

    const out: Finding[] = []
    for (const [slotId, slot] of this.storageSlots) {
      if (!slot.isAddress) {
        promises.push(this.client.getStorageBySlotName(slot.contractAddress, slotId, slot.slotName, blockHash))
      }

      if (slot.isAddress && !slot.isArray) {
        // @ts-ignore
        promises.push(this.client.getStorageAtSlotAddr(slot.contractAddress, slotId, slot.slotAddress, blockHash))
      }

      if (slot.isAddress && slot.isArray) {
        // @ts-ignore
        const len = await this.client.getStorageAtSlotAddr(slot.contractAddress, slotId, slot.slotAddress, blockHash)
        if (E.isLeft(len)) {
          out.push(
            networkAlert(
              len.left,
              `Error in ${StorageWatcherSrv.name}.${this.handleBlock.name}:55`,
              `Could not call getStorageAtSlotAddr by ${slot.contactName}`,
            ),
          )
          continue
        }

        promisesArray.push(
          this.client.getStorageArrayAtSlotAddr(
            slot.contractAddress,
            slotId,
            // @ts-ignore
            slot.slotAddress,
            blockHash,
            new BigNumber(len.right.value).toNumber(),
          ),
        )
      }
    }

    let responsesRaw: E.Either<Error, StorageItemResponse>[] = []
    try {
      responsesRaw = await Promise.all(promises)
    } catch (e) {
      out.push(
        networkAlert(
          new Error(`Network Error: ${e}`),
          `Error in ${StorageWatcherSrv.name}.${this.handleBlock.name}:84`,
          `Could not get responses getStorageAtSlotAddr`,
        ),
      )
    }

    for (const resp of responsesRaw) {
      if (E.isLeft(resp)) {
        out.push(
          networkAlert(
            resp.left,
            `Error in ${StorageWatcherSrv.name}.${this.handleBlock.name}:45|50`,
            `Could not call getStorageAtSlotAddr`,
          ),
        )
        continue
      }

      // @ts-ignore
      const prevValue: string = this.cacheItemValue.get(resp.right.slotId)
      // @ts-ignore
      const slot: StorageSlot = this.storageSlots.get(resp.right.slotId)
      if (prevValue !== resp.right.value) {
        const f: Finding = new Finding()
        f.setName(`🚨 Critical storage slot value changed`)
        f.setAlertid(`STORAGE-SLOT-VALUE-CHANGED`)
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')
        f.setName(
          `Value of the storage slot ${slot.id}:${slot.slotName}\n` +
            `for contract ${slot.contractAddress} (${slot.contactName}) has changed!\n` +
            `Prev value: ${prevValue}\n` +
            `\nNew value: ${resp.right.value}`,
        )
      }
    }

    let responsesArraysRaw: E.Either<Error, StorageArrayResponse>[] = []
    try {
      responsesArraysRaw = await Promise.all(promisesArray)
    } catch (e) {
      out.push(
        networkAlert(
          new Error(`Network Error: ${e}`),
          `Error in ${StorageWatcherSrv.name}.${this.handleBlock.name}:139`,
          `Could not get responses getStorageArrayAtSlotAddr`,
        ),
      )
    }

    for (const resp of responsesArraysRaw) {
      if (E.isLeft(resp)) {
        out.push(
          networkAlert(
            resp.left,
            `Error in ${StorageWatcherSrv.name}.${this.handleBlock.name}:87`,
            `Could not call getStorageArrayAtSlotAddr`,
          ),
        )
        continue
      }

      // @ts-ignore
      const prevValues: string[] = this.cacheItemValues.get(resp.right.slotId)
      // @ts-ignore
      const slot: StorageSlot = this.storageSlots.get(resp.right.slotId)

      // TODO we need to compare arrays
      // There are several strategies:
      // Sets: we could not use this approach -
      //       because in different addresses could be same hash values.
      //       We'll lose comparable values
      //
      // Arrays: Loop to each other to finding diff
      //
      // Strings: to compare content as strings
      // Perhaps we'll think about certain mechanism further
      const prev = JSON.stringify(prevValues)
      const curr = JSON.stringify(resp.right.values)

      if (prev !== curr) {
        const f: Finding = new Finding()
        f.setName(`🚨 Critical storage slot value changed`)
        f.setAlertid(`STORAGE-SLOT-VALUE-CHANGED`)
        f.setSeverity(Finding.Severity.CRITICAL)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')
        f.setName(
          `Value of the storage slot ${slot.id}:${slot.slotName}\n` +
            `for contract ${slot.contractAddress} (${slot.contactName}) has changed!\n` +
            `Prev value: ${prev}\n` +
            `New value: ${curr}`,
        )
      }
    }

    this.logger.info(elapsedTime(StorageWatcherSrv.name + '.' + this.handleBlock.name, start))
    return out
  }
}
