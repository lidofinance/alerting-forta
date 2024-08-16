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

  constructor(logger: Logger, storageSlots: StorageSlot[], client: IStorageWatcherClient) {
    this.logger = logger
    this.storageSlots = new Map<number, StorageSlot>()
    this.client = client

    for (const slot of storageSlots) {
      this.storageSlots.set(slot.id, slot)
    }
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
      const prevValue: StorageSlot = this.storageSlots.get(resp.right.slotId)
      // @ts-ignore
      const slot: StorageSlot = this.storageSlots.get(resp.right.slotId)
      if (prevValue.expected !== resp.right.value) {
        const f: Finding = new Finding()
        f.setName(`🚨 Storage slot value changed`)
        f.setAlertid(`STORAGE-SLOT-VALUE-CHANGED`)
        f.setSeverity(Finding.Severity.HIGH)
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

      const slot: StorageSlot = <StorageSlot>this.storageSlots.get(resp.right.slotId)
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
