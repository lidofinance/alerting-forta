import BigNumber from 'bignumber.js'
import { either as E } from 'fp-ts'
import { Logger } from 'winston'
import { BlockDto } from '../../entity/events'
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
  private readonly storageSlots: StorageSlot[]
  private readonly storageSlotMap: Map<number, StorageSlot>
  private readonly client: IStorageWatcherClient

  constructor(logger: Logger, storageSlots: StorageSlot[], client: IStorageWatcherClient) {
    this.logger = logger
    this.storageSlotMap = new Map<number, StorageSlot>()
    this.storageSlots = storageSlots
    this.client = client

    for (const slot of storageSlots) {
      this.storageSlotMap.set(slot.id, slot)
    }
  }

  public async handleBlock(blockDtoEvent: BlockDto): Promise<Finding[]> {
    const lotteryNum = (blockDtoEvent.number % 10) + 1

    const step = Math.floor(this.storageSlots.length / 9)
    const finish = lotteryNum * step
    const begin = finish - step

    if (finish > this.storageSlots.length || begin > this.storageSlots.length) {
      return []
    }

    const start = new Date().getTime()
    const part = this.storageSlots.slice(begin, finish)
    const promises = []
    const promisesArray = []
    const out: Finding[] = []

    for (const slot of part) {
      if (!slot.isAddress) {
        promises.push(
          this.client.getStorageBySlotName(slot.contractAddress, slot.id, slot.slotName, blockDtoEvent.hash),
        )
      }

      if (slot.isAddress && !slot.isArray) {
        promises.push(
          this.client.getStorageAtSlotAddr(slot.contractAddress, slot.id, <string>slot.slotAddress, blockDtoEvent.hash),
        )
      }

      if (slot.isAddress && slot.isArray) {
        const len = await this.client.getStorageAtSlotAddr(
          slot.contractAddress,
          slot.id,
          <string>slot.slotAddress,
          blockDtoEvent.hash,
        )
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
            slot.id,
            <string>slot.slotAddress,
            blockDtoEvent.hash,
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

      const slot: StorageSlot = <StorageSlot>this.storageSlotMap.get(resp.right.slotId)
      if (slot.expected !== resp.right.value) {
        const f: Finding = new Finding()
        f.setName(`🚨 Storage slot value changed`)
        f.setAlertid(`STORAGE-SLOT-VALUE-CHANGED`)
        f.setSeverity(Finding.Severity.HIGH)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')
        f.setName(
          `Value of the storage slot ${slot.id}:${slot.slotName}\n` +
            `for contract ${slot.contractAddress} (${slot.contactName}) has changed!\n` +
            `Prev value: ${slot.expected}\n` +
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

      const slot: StorageSlot = <StorageSlot>this.storageSlotMap.get(resp.right.slotId)
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
      const curr = JSON.stringify(resp.right.values)

      if (slot.expected !== curr) {
        const f: Finding = new Finding()
        f.setName(`🚨 Storage slot value changed`)
        f.setAlertid(`STORAGE-SLOT-VALUE-CHANGED`)
        f.setSeverity(Finding.Severity.HIGH)
        f.setType(Finding.FindingType.SUSPICIOUS)
        f.setProtocol('ethereum')
        f.setName(
          `Value of the storage slot ${slot.id}:${slot.slotName}\n` +
            `for contract ${slot.contractAddress} (${slot.contactName}) has changed!\n` +
            `Prev value: ${slot.expected}\n` +
            `New value: ${curr}`,
        )
      }
    }

    this.logger.info(elapsedTime(StorageWatcherSrv.name + '.' + this.handleBlock.name, start))
    return out
  }
}
