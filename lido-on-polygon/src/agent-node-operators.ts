import {
  ethers,
  BlockEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import NODE_OPERATORS_ABI from "./abi/NodeOperators.json";
import MATIC_STAKING_NFT_ABI from "./abi/MaticStakingNFT.json";
import STAKE_MANAGER_ABI from "./abi/StakeManager.json";
import {
  NODE_OPERATORS_REGISTRY_ADDRESS,
  MATIC_STAKING_NFT_ADDRESS,
  POLYGON_STAKE_MANAGER_PROXY,
  LIDO_VALIDATORS_IDS,
  BLOCK_AT_11_59_59_UTC,
  BLOCKS_PER_DAY,
} from "./constants";
import { ethersProvider } from "./ethers";
import { getNORVersion } from "./helpers";

// 2 hours
const REPORT_WINDOW_BAD_OPERATORS_STATE = 60 * 60 * 2;
// 2 hours
const REPORT_WINDOW_NO_NFT_OWNER = 60 * 60 * 2;

const lidoValidatorGoesInactiveReport: Set<string> = new Set();

let lastReportedBadOperatorsState = 0;
let lastReportedBadNftOwner = 0;

export const name = "NodeOperators";

export async function initialize(): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  const handlers: { (b: BlockEvent, f: Finding[]): Promise<void> }[] = [];
  handlers.push(handleNodeOperatorsActiveSet); // should be checked always

  const version = await getNORVersion(blockEvent.blockNumber);
  if (version.replace(/("|')/, "").startsWith("1.")) {
    handlers.push(handleNodeOperatorsNftOwners);
    handlers.push(handleNodeOperatorsStatus);
  }

  await Promise.all(handlers.map((h) => h(blockEvent, findings)));

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

async function handleNodeOperatorsActiveSet(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  interface IsValidatorResult {
    isValidator: boolean;
    vId: string;
  }

  // just aliases for readability
  const isNotActive = (r: IsValidatorResult) => !r.isValidator;
  const isActive = (r: IsValidatorResult) => !!r.isValidator;

  const popFromReported = (r: IsValidatorResult) => {
    return (lidoValidatorGoesInactiveReport.delete(r.vId) && r) || undefined;
  };
  const addToReported = (r: IsValidatorResult) => {
    lidoValidatorGoesInactiveReport.add(r.vId);
  };

  const stakeManager = new ethers.Contract(
    POLYGON_STAKE_MANAGER_PROXY,
    STAKE_MANAGER_ABI,
    ethersProvider
  );

  const rows: IsValidatorResult[] = await Promise.all(
    Object.keys(LIDO_VALIDATORS_IDS).map(async (vId) => {
      const request: [boolean] = await stakeManager.functions.isValidator(vId, {
        blockTag: blockEvent.blockNumber,
      });

      return {
        isValidator: request[0], // why its an array?
        vId,
      };
    })
  );

  // first time or every ~ 24 hours otherwise
  const mayFire = (r: IsValidatorResult) =>
    !lidoValidatorGoesInactiveReport.has(r.vId) ||
    (blockEvent.blockNumber - BLOCK_AT_11_59_59_UTC) % BLOCKS_PER_DAY === 0;

  rows
    .filter(isNotActive)
    .filter(mayFire)
    .forEach((r) => {
      addToReported(r);
      findings.push(
        Finding.fromObject({
          name: "🚨 Lido validator is not in the active set",
          description: `Lido validator ${LIDO_VALIDATORS_IDS[r.vId]} of NFT ${
            r.vId
          } is not in the active set`,
          alertId: "LIDO-VALIDATOR-NOT-IN-ACTIVE-SET",
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        })
      );
    });

  rows.filter(isActive).forEach((r) => {
    const reported = popFromReported(r);
    if (reported) {
      findings.push(
        Finding.fromObject({
          name: "✅ Lido validator is back in the active set",
          description: `Lido validator ${LIDO_VALIDATORS_IDS[r.vId]} of NFT ${
            r.vId
          } is back in the active set`,
          alertId: "LIDO-VALIDATOR-BACK-IN-ACTIVE-SET",
          severity: FindingSeverity.Low,
          type: FindingType.Info,
        })
      );
    }
  });
}
