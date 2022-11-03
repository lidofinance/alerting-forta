import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { STORAGE_SLOTS, ContractStorageMap, StorageSlot } from "./constants";
import { getStorageValue } from "./helpers";

export const name = "StorageWatched";

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
          const value = await getStorageValue(
            contractStorageMap.contract.address,
            slot,
            blockNumber
          );
          if (checkValues) {
            const prevValue = contractInfo.get(slot.name);
            if (value != prevValue && prevValue) {
              findings.push(
                Finding.fromObject({
                  name: `🚨 Critical storage slot value changed`,
                  description:
                    `Value of the storage slot ${slot.name} ` +
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
