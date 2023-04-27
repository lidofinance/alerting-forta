import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";
import { formatDelay, RedefineMode, requireWithTier } from "../../common/utils";

import * as Constants from "./constants";
import { ethersProvider } from "../../ethers";

import GATE_SEAL_ABI from "../../abi/GateSeal.json";
import WITHDRAWAL_QUEUE_ABI from "../../abi/WithdrawalQueueERC721.json";
import EXITBUS_ORACLE_ABI from "../../abi/ValidatorsExitBusOracle.json";

const {
  GATE_SEAL_FACTORY_ADDRESS,
  GATE_SEAL_DEFAULT_ADDRESS,
  WITHDRAWAL_QUEUE_ADDRESS,
  EXITBUS_ORACLE_ADDRESS,
  GATE_SEAL_SEALED_EVENT,
  GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT,
  GATE_SEAL_EXPIRY_THRESHOLD,
  GATE_SEAL_EXPIRY_TRIGGER_EVERY,
  GATE_SEAL_WITHOUT_PAUSE_ROLE_TRIGGER_EVERY,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge
);

export const name = "GateSeal";

let actualGateSeal: string | undefined;

let lastExpiryGateSealAlertTimestamp = 0;
let lastNoPauseRoleAlertTimestamp = 0;

let initFindings: Finding[] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const status = await checkGateSeal(currentBlock, GATE_SEAL_DEFAULT_ADDRESS);

  if (!status) {
    initFindings.push(
      Finding.fromObject({
        name: "⚠️ GateSeal: default GateSeal address in forta agent is expired",
        description: `GateSeal address: ${GATE_SEAL_DEFAULT_ADDRESS}]`,
        alertId: "GATE-SEAL-DEFAULT-EXPIRED",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })
    );
  } else {
    const { roleForExitBus, roleForWithdrawalQueue } = status;
    if (!roleForExitBus || !roleForWithdrawalQueue) {
      let additionalDesc = "";
      if (!roleForExitBus)
        additionalDesc += `\nNo PAUSE_ROLE for ExitBus address: ${EXITBUS_ORACLE_ADDRESS}`;
      if (!roleForWithdrawalQueue)
        additionalDesc += `\nNo PAUSE_ROLE for WithdrawalQueue address: ${WITHDRAWAL_QUEUE_ADDRESS}`;
      initFindings.push(
        Finding.fromObject({
          name: "⚠️ GateSeal: default GateSeal address in forta agent doesn't have PAUSE_ROLE for contracts",
          description: `GateSeal address: ${GATE_SEAL_DEFAULT_ADDRESS}${additionalDesc}`,
          alertId: "GATE-SEAL-DEFAULT-WITHOUT-ROLE",
          severity: FindingSeverity.High,
          type: FindingType.Info,
        })
      );
    }
  }

  actualGateSeal = GATE_SEAL_DEFAULT_ADDRESS;

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (initFindings.length > 0) {
    findings.push(...initFindings);
    initFindings = [];
  }

  await handlePauseRole(blockEvent, findings);
  await handleExpiryGateSeal(blockEvent, findings);

  return findings;
}

async function handlePauseRole(blockEvent: BlockEvent, findings: Finding[]) {
  if (!actualGateSeal) {
    // No actual GateSeal
    return;
  }
  const now = blockEvent.block.timestamp;
  const status = await checkGateSeal(blockEvent.blockNumber, actualGateSeal);
  if (!status) return;
  const { roleForExitBus, roleForWithdrawalQueue } = status;
  if (!roleForExitBus || !roleForWithdrawalQueue) {
    let additionalDesc = "";
    if (!roleForExitBus)
      additionalDesc += `\nNo PAUSE_ROLE for ExitBus address: ${EXITBUS_ORACLE_ADDRESS}`;
    if (!roleForWithdrawalQueue)
      additionalDesc += `\nNo PAUSE_ROLE for WithdrawalQueue address: ${WITHDRAWAL_QUEUE_ADDRESS}`;
    if (
      now - lastNoPauseRoleAlertTimestamp >
      GATE_SEAL_WITHOUT_PAUSE_ROLE_TRIGGER_EVERY
    ) {
      findings.push(
        Finding.fromObject({
          name: "🚨GateSeal: actual address doesn't have PAUSE_ROLE for contracts",
          description: `GateSeal address: ${actualGateSeal}${additionalDesc}`,
          alertId: "GATE-SEAL-WITHOUT-PAUSE-ROLE",
          severity: FindingSeverity.Critical,
          type: FindingType.Degraded,
        })
      );
      lastNoPauseRoleAlertTimestamp = now;
    }
  }
}

async function handleExpiryGateSeal(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  if (!actualGateSeal) {
    // No actual GateSeal
    return;
  }
  const now = blockEvent.block.timestamp;
  const gateSeal = new ethers.Contract(
    actualGateSeal,
    GATE_SEAL_ABI,
    ethersProvider
  );
  const [expiryTimestamp] = await gateSeal.functions.get_expiry_timestamp({
    blockTag: blockEvent.block.number,
  });
  if (expiryTimestamp == "0" || Number(expiryTimestamp) <= now) {
    findings.push(
      Finding.fromObject({
        name: "🚨🚨🚨 GateSeal: is expired! 🚨🚨🚨",
        description: `GateSeal address: ${actualGateSeal}}`,
        alertId: "GATE-SEAL-IS-EXPIRED",
        severity: FindingSeverity.Critical,
        type: FindingType.Degraded,
      })
    );
    actualGateSeal = undefined;
  } else if (
    now - lastExpiryGateSealAlertTimestamp >
    GATE_SEAL_EXPIRY_TRIGGER_EVERY
  ) {
    if (Number(expiryTimestamp) - now <= GATE_SEAL_EXPIRY_THRESHOLD) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ GateSeal: is about to be expired",
          description: `GateSeal address: ${actualGateSeal}\nExpiry date ${new Date(
            String(expiryTimestamp)
          )}`,
          alertId: "GATE-SEAL-IS-ABOUT-TO-BE-EXPIRED",
          severity: FindingSeverity.Critical,
          type: FindingType.Degraded,
        })
      );
      lastExpiryGateSealAlertTimestamp = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleSealedGateSeal(txEvent, findings);
  await handleNewGateSeal(txEvent, findings);

  return findings;
}

async function handleSealedGateSeal(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (!actualGateSeal) {
    // No actual GateSeal
    return;
  }
  const sealedEvents = txEvent.filterLog(
    GATE_SEAL_SEALED_EVENT,
    actualGateSeal
  );
  if (!sealedEvents) return;
  for (const sealedEvent of sealedEvents) {
    const { sealed_by, sealed_for, sealable } = sealedEvent.args;
    const duration = formatDelay(Number(sealed_for));
    findings.push(
      Finding.fromObject({
        name: "🚨🚨🚨 GateSeal: is sealed 🚨🚨🚨",
        description: `GateSeal address: ${actualGateSeal}\nSealed by: ${sealed_by}\nSealed for: ${duration}\nSealable: ${sealable}`,
        alertId: "GATE-SEAL-IS-SEALED",
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      })
    );
  }
}

async function handleNewGateSeal(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const newGateSealEvents = txEvent.filterLog(
    GATE_SEAL_FACTORY_GATE_SEAL_CREATED_EVENT,
    GATE_SEAL_FACTORY_ADDRESS
  );
  if (!newGateSealEvents) return;
  for (const newGateSealEvent of newGateSealEvents) {
    const { gate_seal } = newGateSealEvent.args;
    findings.push(
      Finding.fromObject({
        name: "🚨 GateSeal: new one created",
        description: `GateSeal address: ${gate_seal}\ndev: Please, update \`GATE_SEAL_DEFAULT_ADDRESS\` in code`,
        alertId: "GATE-SEAL-NEW-ONE-CREATED",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })
    );
    actualGateSeal = gate_seal;
  }
}

async function checkGateSeal(
  blockNumber: number,
  gateSealAddress: string
): Promise<
  { roleForWithdrawalQueue: boolean; roleForExitBus: boolean } | undefined
> {
  let roleForWithdrawalQueue = false;
  let roleForExitBus = false;
  const gateSeal = new ethers.Contract(
    gateSealAddress,
    GATE_SEAL_ABI,
    ethersProvider
  );
  const [expired] = await gateSeal.functions.is_expired({
    blockTag: blockNumber,
  });
  if (expired) return undefined;
  const keccakGateSeal = ethers.utils.keccak256(gateSealAddress);
  const withdrawalQueue = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );
  const exitBusOracle = new ethers.Contract(
    EXITBUS_ORACLE_ADDRESS,
    EXITBUS_ORACLE_ABI,
    ethersProvider
  );
  const [queuePauseRole] = await withdrawalQueue.functions.PAUSE_ROLE({
    blockTag: blockNumber,
  });
  const [exitBusPauseRole] = await exitBusOracle.functions.PAUSE_ROLE({
    blockTag: blockNumber,
  });
  roleForExitBus = keccakGateSeal == exitBusPauseRole;
  roleForWithdrawalQueue = keccakGateSeal == queuePauseRole;
  return { roleForExitBus, roleForWithdrawalQueue };
}
