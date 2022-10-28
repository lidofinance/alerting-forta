import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import NODE_OPERATORS_V1_ABI from "./abi/NodeOperators.json";
import NODE_OPERATORS_V2_ABI from "./abi/NodeOperatorsV2.json";
import MATIC_STAKING_NFT_ABI from "./abi/MaticStakingNFT.json";
import {
  NODE_OPERATORS_REGISTRY_ADDRESS,
  MATIC_STAKING_NFT_ADDRESS,
  NODE_OPERATORS_ADMIN_EVENTS,
} from "./constants";
import { BigNumber } from "ethers";

// 2 hours
const REPORT_WINDOW_BAD_OPERATORS_STATE = 60 * 60 * 2;
// 2 hours
const REPORT_WINDOW_NO_NFT_OWNER = 60 * 60 * 2;

let lastReportedBadOperatorsState = 0;
let lastReportedBadNftOwner = 0;

export const name = "NodeOperatorsV2";

export async function initialize(): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

// TODO remove after transition
async function isV1(blockTag: number | string) {
  const nodeOperatorsV1 = new ethers.Contract(
    NODE_OPERATORS_REGISTRY_ADDRESS,
    NODE_OPERATORS_V1_ABI,
    ethersProvider
  );

  try {
    await nodeOperatorsV1.functions.version({ blockTag });
  } catch (error: any) {
    console.log(JSON.stringify(error));
    if (error.code === ethers.utils.Logger.errors.CALL_EXCEPTION) {
      return false;
    }
    throw error;
  }

  return true;
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (await isV1(blockEvent.blockNumber)) {
    return findings; // nothing to do
  }

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
  const nodeOperators = new ethers.Contract(
    NODE_OPERATORS_REGISTRY_ADDRESS,
    NODE_OPERATORS_V2_ABI,
    ethersProvider
  );

  const stats = await nodeOperators.functions.getStats({
    blockTag: blockEvent.blockNumber,
  });

  const cntEjected = stats.ejectedNodeOperator.toNumber();
  const cntJailed = stats.jailedNodeOperator.toNumber();
  const cntActive = stats.activeNodeOperator.toNumber();

  if (cntActive === 0) {
    findings.push(
      Finding.fromObject({
        name: "🚨 No Active Node Operators",
        description: `There are 0 active node operators!`,
        alertId: "NO-ACTIVE-NODE-OPERATORS-POLYGON",
        severity: FindingSeverity.Critical,
        type: FindingType.Degraded,
      })
    );
  }

  if (
    lastReportedBadOperatorsState + REPORT_WINDOW_BAD_OPERATORS_STATE < now &&
    cntJailed + cntEjected > 0
  ) {
    findings.push(
      Finding.fromObject({
        name: "🚨 Bad Node Operators state",
        description: `There are node operators with jailed: ${cntJailed}, ejected: ${cntEjected} among Polygon Node Operators`,
        alertId: "BAD-OPERATOR-STATUS-POLYGON",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
      })
    );
    lastReportedBadOperatorsState = now;
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
      NODE_OPERATORS_V2_ABI,
      ethersProvider
    );

    const stackingNFT = new ethers.Contract(
      MATIC_STAKING_NFT_ADDRESS,
      MATIC_STAKING_NFT_ABI,
      ethersProvider
    );

    const vIds = await nodeOperators.functions.getValidatorIds({
      blockTag: blockEvent.blockNumber,
    });

    await Promise.all(
      vIds.map(async (id: BigNumber) => {
        let info = await nodeOperators.functions.getNodeOperator(
          id.toNumber(),
          {
            blockTag: blockEvent.blockNumber,
          }
        );
        stackingNFT.functions
          .ownerOf(info.validatorId, {
            blockTag: blockEvent.blockNumber,
          })
          .then((value) => {
            if (value !== info.rewardAddress) {
              findings.push(
                Finding.fromObject({
                  name: "🚨 Bad Node Operator proxy NFT owner",
                  description: `Staking NFT related to the validator ${info.validatorId} should be owned by ${info.rewardAddress} but actually owned by ${value}`,
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

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  await Promise.all([handleNodeOperatorsTx(txEvent, findings)]);
  return findings;
}

function handleNodeOperatorsTx(txEvent: TransactionEvent, findings: Finding[]) {
  NODE_OPERATORS_ADMIN_EVENTS.forEach((eventInfo) => {
    if (txEvent.to === eventInfo.address) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        let severity = eventInfo.severity;
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: severity,
            type: eventInfo.type,
            metadata: { args: String(event.args) },
          })
        );
      });
    }
  });
}
