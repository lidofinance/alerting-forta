import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import NODE_OPERATORS_REGISTRY_ABI from "./abi/NodeOperatorsRegistry.json";

import {
  NODE_OPERATORS_REGISTRY_ADDRESS,
  MIN_AVAILABLE_KEYS_COUNT,
} from "./constants";

export const name = "DaoOps";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all(
    [
      handleNodeOperatorsKeys(blockEvent, findings),
    ]
  )

  return findings;
}

async function handleNodeOperatorsKeys(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const nodeOperatorsRegistry = new ethers.Contract(
    NODE_OPERATORS_REGISTRY_ADDRESS,
    NODE_OPERATORS_REGISTRY_ABI,
    ethersProvider
  );
  const nodeOperatorsCount =
    await nodeOperatorsRegistry.functions.getActiveNodeOperatorsCount();
  let availableKeysCount = 0;
  for (let i = 0; i < nodeOperatorsCount; i++) {
    availableKeysCount +=
      parseInt(String(await nodeOperatorsRegistry.functions.getUnusedSigningKeyCount(i)));
  }
  console.log(availableKeysCount);
  if (availableKeysCount < MIN_AVAILABLE_KEYS_COUNT) {
    findings.push(
      Finding.fromObject({
        name: "Few available keys count",
        description: `There are only ${availableKeysCount} available keys left`,
        alertId: "LOW_OPERATORS_AVAILABLE_KEYS_NUM",
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
      })
    );
  }
}
