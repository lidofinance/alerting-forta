import {
  ethers,
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import NODE_OPERATORS_ABI from "./abi/NodeOperators.json";
import MATIC_STAKING_NFT_ABI from "./abi/MaticStakingNFT.json";
import {
  NODE_OPERATORS_REGISTRY_ADDRESS,
  MATIC_STAKING_NFT_ADDRESS,
} from "./constants";

// 2 hours
const REPORT_WINDOW_BAD_OPERATORS_STATE = 60 * 60 * 2;
// 2 hours
const REPORT_WINDOW_NO_NFT_OWNER = 60 * 60 * 2;

let lastReportedBadOperatorsState = 0;
let lastReportedBadNftOwner = 0;

export const name = "NodeOperators";

export async function initialize(): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleNodeOperatorsStatus(blockEvent, findings),
    handleNodeOperatorsNftOwners(blockEvent, findings),
  ]);

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
          key in ["_totalJailedNodeOperator", "_totalEjectedNodeOperator"] &&
          parsedValue !== 0
        ) {
          error += `${key}=${parsedValue},\n`;
        }
        if (key == "_totalActiveNodeOperator" && parsedValue == 0) {
          findings.push(
            Finding.fromObject({
              name: "🚨 No Active Node Operators",
              description: `There are ${parsedValue} active node operators!`,
              alertId: "NO-ACTIVE-NODE-OPERATORS-POLYGON",
              severity: FindingSeverity.Critical,
              type: FindingType.Degraded,
            })
          );
        }
      }
    }
    if (error !== "") {
      findings.push(
        Finding.fromObject({
          name: "🚨 Bad Node Operators state",
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

async function handleNodeOperatorsNftOwners(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedBadNftOwner + REPORT_WINDOW_NO_NFT_OWNER < now) {
    const nodeOperators = new ethers.Contract(
      NODE_OPERATORS_REGISTRY_ADDRESS,
      NODE_OPERATORS_ABI,
      ethersProvider
    );

    const stackingNFT = new ethers.Contract(
      MATIC_STAKING_NFT_ADDRESS,
      MATIC_STAKING_NFT_ABI,
      ethersProvider
    );

    const operatorIds = await nodeOperators.functions.getOperatorIds({
      blockTag: blockEvent.blockNumber,
    });

    await Promise.all(
      operatorIds.map(async (id: any) => {
        let info = await nodeOperators.functions
          .getNodeOperator(parseInt(String(id)), {
            blockTag: blockEvent.blockNumber,
          })
          .then((value) => {
            return {
              validatorProxy: value[0].validatorProxy,
              validatorId: parseInt(String(value[0].validatorId)),
              validatorName: value[0].name,
            };
          });
        stackingNFT.functions
          .ownerOf(info.validatorId, {
            blockTag: blockEvent.blockNumber,
          })
          .then((value) => {
            if (value != info.validatorProxy) {
              findings.push(
                Finding.fromObject({
                  name: "🚨 Bad Node Operator proxy NFT owner",
                  description: `Staking NFT related to the node operator ${info.validatorName} should be owned by ${info.validatorProxy} but actually owned by ${value}`,
                  alertId: "BAD-OPERATOR-NFT-OWNER-POLYGON",
                  severity: FindingSeverity.Critical,
                  type: FindingType.Suspicious,
                })
              );
              lastReportedBadNftOwner = now;
            }
          });
      })
    );
  }
}
