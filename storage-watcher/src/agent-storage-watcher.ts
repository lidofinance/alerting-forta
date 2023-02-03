import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { STORAGE_SLOTS, ContractStorageMap, StorageSlot, NULL_STORAGE } from "./constants";
import { getStorageValue } from "./helpers";

export const name = "StorageWatcher";

let contractsStorageValues: Map<string, Map<string, string>> = new Map();

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const findings: Finding[] = [];
  await handleStorageSlots(currentBlock, findings, false);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleStorageSlots(blockEvent.blockNumber, findings, true);

  return findings;
}

async function handleStorageSlots(
  blockNumber: number,
  findings: Finding[],
  checkValues: boolean
) {
  await Promise.all(
    STORAGE_SLOTS.map(async (contractStorageMap: ContractStorageMap) => {
      const contract = contractStorageMap.contract;
      let contractInfo =
        contractsStorageValues.get(contract.address) ||
        new Map<string, string>();
      await Promise.all(
        contractStorageMap.slots.map(async (slot: StorageSlot) => {
          let value = await getStorageValue(
            contractStorageMap.contract.address,
            slot,
            blockNumber
          );
          // fetch value one more time in case of null
          if (value == NULL_STORAGE) {
            value = await getStorageValue(
              contractStorageMap.contract.address,
              slot,
              blockNumber
            );
          }
          if (checkValues) {
            const prevValue = contractInfo.get(slot.name);
            if (prevValue && prevValue != value) {
              findings.push(
                Finding.fromObject({
                  name: `🚨 Critical storage slot value changed`,
                  description:
                    `Value of the storage slot '${slot.name}' ` +
                    `for contract ${contract.address} (${contract.name}) has changed!` +
                    `\nPrev value: ${prevValue}` +
                    `\nNew value: ${value}`,
                  alertId: "STORAGE-SLOT-VALUE-CHANGED",
                  severity: FindingSeverity.High,
                  type: FindingType.Suspicious,
                })
              );
            }
          }
          contractInfo.set(slot.name, value);
        })
      );
      contractsStorageValues.set(contract.address, contractInfo);
    })
  );
}
