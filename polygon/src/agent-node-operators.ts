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

import NODE_OPERATORS_ABI from "./abi/NodeOperators.json";
import { NODE_OPERATORS_REGISTRY_ADDRESS } from "./constants";

// 4 hours
const REPORT_WINDOW_BAD_OPERATORS_STATE = 60 * 60 * 4;

let lastReportedBadOperatorsState = 0;

export const name = "NodeOperators";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleNodeOperatorsStatus(blockEvent, findings)]);

  return findings;
}

async function handleNodeOperatorsStatus(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedBadOperatorsState + REPORT_WINDOW_BAD_OPERATORS_STATE < now) {
    const nodeOperators = new ethers.Contract(
      NODE_OPERATORS_REGISTRY_ADDRESS,
      NODE_OPERATORS_ABI,
      ethersProvider
    );

    const stats = await nodeOperators.functions.getState({
      blockTag: blockEvent.blockNumber,
    });
    let error = "";
    for (const [key, value] of Object.entries(stats)) {
      // exclude digit keys
      if (key.length > 2) {
        const parsedValue = parseInt(String(value));
        if (
          key !== "_totalNodeOperator" &&
          key !== "_totalActiveNodeOperator" &&
          parsedValue !== 0
        ) {
          error += `${key}=${parsedValue},\n`;
        }
      }
    }
    if (error !== "") {
      findings.push(
        Finding.fromObject({
          name: "Bad Node Operators state",
          description: `There are node operators with ${error} among Polygon Node Operators`,
          alertId: "BAD-OPERATOR-STATUS-POLYGON",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBadOperatorsState = now;
    }
  }
}
