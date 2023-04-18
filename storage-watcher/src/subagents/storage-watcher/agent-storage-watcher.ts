import { BlockEvent, Finding, FindingType, FindingSeverity } from "forta-agent";
import { getStorageValue, requireWithTier } from "../../common/utils";
import {
  ContractStorageMap,
  StorageSlot,
  NULL_STORAGE,
} from "../../common/constants";

import type * as Constants from "./constants";
const { STORAGE_SLOTS } = requireWithTier<typeof Constants>(
  module,
  "./constants"
);

export const name = "StorageWatcher";

let contractsStorageValues: Map<
  string,
  Map<string, string | string[]>
> = new Map();

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
        new Map<string, string | string[]>();
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
            if (prevValue && prevValue.toString() != value.toString()) {
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

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
