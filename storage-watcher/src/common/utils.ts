import { StorageSlot } from "../subagents/storage-watcher/constants";
import { ethersProvider } from "../ethers";
import { keccak256 } from "@ethersproject/keccak256";
import { toUtf8Bytes } from "@ethersproject/strings";
import BigNumber from "bignumber.js";

export async function getStorageValue(
  address: string,
  slot: StorageSlot,
  block?: number
) {
  const blockId = block ? block : "latest";
  const slotAddress = slot.address
    ? slot.address
    : keccak256(toUtf8Bytes(slot.name));

  if (slot.isArray) {
    const len = BigNumber(
      await ethersProvider.getStorageAt(address, slotAddress, blockId)
    ).toNumber();

    const arrayStart =
      "0x" + BigNumber(slotAddress, 16).toString(16).padStart(64, "0");

    const values = [];

    for (let i = 0; i < len; i++) {
      values.push(
        await ethersProvider.getStorageAt(
          address,
          "0x" + BigNumber(keccak256(arrayStart)).plus(i).toString(16),
          blockId
        )
      );
    }

    return values;
  }

  return await ethersProvider.getStorageAt(address, slotAddress, blockId);
}
