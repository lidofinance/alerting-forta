import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";
import { BigNumber } from "ethers";

import NODE_OPERATORS_V2_ABI from "./abi/NodeOperatorsV2.json";
import MATIC_STAKING_NFT_ABI from "./abi/MaticStakingNFT.json";
import STAKE_MANAGER_ABI from "./abi/StakeManager.json";
import {
  NODE_OPERATORS_REGISTRY_ADDRESS,
  MATIC_STAKING_NFT_ADDRESS,
  NODE_OPERATORS_ADMIN_EVENTS,
  POLYGON_STAKE_MANAGER_PROXY,
  LIDO_VALIDATORS_IDS,
  BLOCK_AT_11_59_59_UTC,
  BLOCKS_PER_DAY,
} from "./constants";
import { ethersProvider } from "./ethers";

// 2 hours
const REPORT_WINDOW_BAD_OPERATORS_STATE = 60 * 60 * 2;
// 2 hours
const REPORT_WINDOW_NO_NFT_OWNER = 60 * 60 * 2;

const lidoValidatorGoesInactiveReport: Set<string> = new Set();

let lastReportedBadOperatorsState = 0;
let lastReportedBadNftOwner = 0;

export const name = "NodeOperatorsV2";

export async function initialize(): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (blockEvent.blockNumber < 16525714) {
    console.warn("Skipping block before Node Operators V2 upgrade");
    return findings; // do nothing
  }

  await Promise.all([
    handleNodeOperatorsStatus(blockEvent, findings),
    handleNodeOperatorsNftOwners(blockEvent, findings),
    handleNodeOperatorsActiveSet(blockEvent, findings),
  ]);

  return findings;
}

async function handleNodeOperatorsStatus(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const now = blockEvent.block.timestamp;
  const nodeOperators = new ethers.Contract(
    NODE_OPERATORS_REGISTRY_ADDRESS,
    NODE_OPERATORS_V2_ABI,
    ethersProvider,
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
      }),
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
      }),
    );
    lastReportedBadOperatorsState = now;
  }
}

async function handleNodeOperatorsNftOwners(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedBadNftOwner + REPORT_WINDOW_NO_NFT_OWNER < now) {
    const nodeOperators = new ethers.Contract(
      NODE_OPERATORS_REGISTRY_ADDRESS,
      NODE_OPERATORS_V2_ABI,
      ethersProvider,
    );

    const stackingNFT = new ethers.Contract(
      MATIC_STAKING_NFT_ADDRESS,
      MATIC_STAKING_NFT_ABI,
      ethersProvider,
    );

    const vIds = await nodeOperators.getValidatorIds({
      blockTag: blockEvent.blockNumber,
    });

    await Promise.all(
      vIds.map(async (id: BigNumber) => {
        let info = await nodeOperators["getNodeOperator(uint256)"](
          id.toNumber(),
          {
            blockTag: blockEvent.blockNumber,
          },
        );
        stackingNFT.functions
          .ownerOf(info.validatorId, {
            blockTag: blockEvent.blockNumber,
          })
          .then((value) => {
            if (value != info.rewardAddress) {
              findings.push(
                Finding.fromObject({
                  name: "🚨 Bad Node Operator proxy NFT owner",
                  description: `Staking NFT related to the validator ${info.validatorId} should be owned by ${info.rewardAddress} but actually owned by ${value}`,
                  alertId: "BAD-OPERATOR-NFT-OWNER-POLYGON",
                  severity: FindingSeverity.Critical,
                  type: FindingType.Suspicious,
                }),
              );
              lastReportedBadNftOwner = now;
            }
          });
      }),
    );
  }
}

async function handleNodeOperatorsActiveSet(
  blockEvent: BlockEvent,
  findings: Finding[],
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
    ethersProvider,
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
    }),
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
        }),
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
        }),
      );
    }
  });
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  await Promise.all([handleNodeOperatorsTx(txEvent, findings)]);
  return findings;
}

function handleNodeOperatorsTx(txEvent: TransactionEvent, findings: Finding[]) {
  NODE_OPERATORS_ADMIN_EVENTS.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
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
          }),
        );
      });
    }
  });
}
