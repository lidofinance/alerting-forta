import { StorageSlot } from "./constants";
import { ethersProvider } from "./ethers";
import { keccak256 } from "@ethersproject/keccak256";
import { toUtf8Bytes } from "@ethersproject/strings";

export async function getStorageValue(address: string, slot: StorageSlot, block?: number) {
    const slotAddress = slot.address ? slot.address : keccak256(toUtf8Bytes(slot.name))
    return await ethersProvider.getStorageAt(address, slotAddress, block ? block : "latest")
}