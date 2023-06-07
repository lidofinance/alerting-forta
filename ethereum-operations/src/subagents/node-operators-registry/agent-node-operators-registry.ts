import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  LogDescription,
  TransactionEvent,
} from "forta-agent";

import {
  formatDelay,
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";
import STAKING_ROUTER_ABI from "../../abi/StakingRouter.json";
import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";
import { ethersProvider } from "../../ethers";
const {
  NODE_OPERATOR_REGISTRY_MODULE_ID,
  NODE_OPERATORS_REGISTRY_ADDRESS,
  EASY_TRACK_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  MOTION_ENACTED_EVENT,
  SIGNING_KEY_REMOVED_EVENT,
  NODE_OPERATOR_VETTED_KEYS_COUNT_EVENT,
  NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE,
  NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT,
  NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT,
  NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD,
  NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD,
  STUCK_PENALTY_ENDED_TRIGGER_PERIOD,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

let lastAlertedClosestPenaltyEndTimestamp = 0;
let lastPenaltyEndTimestampAlertTimestamp = 0;

export const name = "NodeOperatorsRegistry";

interface NodeOperatorShortDigest {
  stuck: number;
  refunded: number;
  exited: number;
  isStuckRefunded: boolean;
  stuckPenaltyEndTimestamp: number;
}

const nodeOperatorDigests = new Map<string, NodeOperatorShortDigest>();
let initFindings: Finding[] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const stakingRouter = new ethers.Contract(
    STAKING_ROUTER_ADDRESS,
    STAKING_ROUTER_ABI,
    ethersProvider
  );

  const nodeOperatorRegistry = new ethers.Contract(
    NODE_OPERATORS_REGISTRY_ADDRESS,
    NODE_OPERATORS_REGISTRY_ABI,
    ethersProvider
  );

  const [operators] = await stakingRouter.functions.getAllNodeOperatorDigests(
    NODE_OPERATOR_REGISTRY_MODULE_ID,
    { blockTag: currentBlock }
  );

  const stuckOperators = operators.filter(
    (digest: any) => Number(digest.summary.stuckValidatorsCount) != 0
  );

  const stuckOperatorsSummaries = await Promise.all(
    stuckOperators.map((digest: any) =>
      nodeOperatorRegistry.functions.getNodeOperatorSummary(digest.id, {
        blockTag: currentBlock,
      })
    )
  );

  const stuckOperatorsEndTimestampMap = new Map<String, number>(
    stuckOperators.map((digest: any, index: number) => [
      String(digest.id),
      Number(stuckOperatorsSummaries[index].stuckPenaltyEndTimestamp),
    ])
  );

  for (const digest of operators) {
    nodeOperatorDigests.set(String(digest.id), {
      stuck: Number(digest.summary.stuckValidatorsCount),
      refunded: Number(digest.summary.refundedValidatorsCount),
      exited: Number(digest.summary.totalExitedValidators),
      isStuckRefunded:
        Number(digest.summary.refundedValidatorsCount) >=
        Number(digest.summary.stuckValidatorsCount),
      stuckPenaltyEndTimestamp:
        stuckOperatorsEndTimestampMap.get(String(digest.id)) ?? 0,
    });
  }

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (initFindings.length > 0) {
    findings.push(...initFindings);
    initFindings = [];
  }

  handleEventsOfNotice(
    txEvent,
    findings,
    NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE
  );

  const stuckEvents = txEvent.filterLog(
    NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT,
    NODE_OPERATORS_REGISTRY_ADDRESS
  );

  // the order is important
  handleExitedCountChanged(txEvent, stuckEvents, findings);
  handleStuckStateChanged(stuckEvents, findings);

  handleSigningKeysRemoved(txEvent, findings);
  handleStakeLimitSet(txEvent, findings);

  return findings;
}

function handleExitedCountChanged(
  txEvent: TransactionEvent,
  stuckEvents: LogDescription[],
  findings: Finding[]
) {
  const exitEvents = txEvent.filterLog(
    NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT,
    NODE_OPERATORS_REGISTRY_ADDRESS
  );
  if (!exitEvents) return;
  for (const exit of exitEvents) {
    const { nodeOperatorId, exitedValidatorsCount } = exit.args;
    const lastDigest = nodeOperatorDigests.get(
      String(nodeOperatorId)
    ) as NodeOperatorShortDigest;
    const newExited = Number(exitedValidatorsCount) - lastDigest.exited;
    if (newExited > NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ NO Registry: operator exited more than ${NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD} validators`,
          description: `Operator ID: ${nodeOperatorId}\nNew exited: ${newExited}`,
          alertId: "NODE-OPERATORS-BIG-EXIT",
          severity: FindingSeverity.Info,
          type: FindingType.Info,
        })
      );
    }
    let actualStuckCount = lastDigest.stuck;
    if (newExited > 0) {
      const stuckEvent = stuckEvents.find(
        (e: any) => String(e.args.nodeOperatorId) == String(nodeOperatorId)
      );
      actualStuckCount = stuckEvent
        ? Number(stuckEvent.args.stuckValidatorsCount)
        : lastDigest.stuck;
      if (lastDigest.stuck > 0 && actualStuckCount == 0) {
        findings.push(
          Finding.fromObject({
            name: "ℹ️ NO Registry: operator exited all stuck keys 🎉",
            description: `Operator ID: ${nodeOperatorId}\nStuck exited: ${lastDigest.stuck}`,
            alertId: "NODE-OPERATORS-ALL-STUCK-EXITED",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
          })
        );
      }
    }
    nodeOperatorDigests.set(String(nodeOperatorId), {
      ...lastDigest,
      exited: Number(exitedValidatorsCount),
    });
  }
}

function handleStuckStateChanged(
  events: LogDescription[],
  findings: Finding[]
) {
  if (!events) return;
  for (const event of events) {
    const { nodeOperatorId, stuckValidatorsCount, refundedValidatorsCount } =
      event.args;
    const lastDigest = nodeOperatorDigests.get(
      String(nodeOperatorId)
    ) as NodeOperatorShortDigest;
    const newStuck = Number(stuckValidatorsCount) - lastDigest.stuck;
    if (newStuck > 0) {
      if (newStuck > NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD) {
        findings.push(
          Finding.fromObject({
            name: "⚠️ NO Registry: operator have new stuck keys",
            description: `Operator ID: ${nodeOperatorId}\nNew stuck: ${stuckValidatorsCount}`,
            alertId: "NODE-OPERATORS-NEW-STUCK-KEYS",
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          })
        );
      }
    }
    const newRefunded = Number(refundedValidatorsCount) - lastDigest.refunded;
    if (newRefunded > 0) {
      if (
        !lastDigest.isStuckRefunded &&
        Number(refundedValidatorsCount) >= Number(stuckValidatorsCount)
      ) {
        findings.push(
          Finding.fromObject({
            name: "ℹ️ NO Registry: operator refunded all stuck keys 🎉",
            description: `Operator ID: ${nodeOperatorId}\nRefunded: ${refundedValidatorsCount}`,
            alertId: "NODE-OPERATORS-ALL-STUCK-REFUNDED",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
          })
        );
      }
    }
    nodeOperatorDigests.set(String(nodeOperatorId), {
      ...lastDigest,
      stuck: Number(stuckValidatorsCount),
      refunded: Number(refundedValidatorsCount),
      isStuckRefunded:
        Number(refundedValidatorsCount) >= Number(stuckValidatorsCount),
      stuckPenaltyEndTimestamp: Number(event.args.stuckPenaltyEndTimestamp),
    });
  }
}

function handleSigningKeysRemoved(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (NODE_OPERATORS_REGISTRY_ADDRESS in txEvent.addresses) {
    const events = txEvent.filterLog(
      SIGNING_KEY_REMOVED_EVENT,
      NODE_OPERATORS_REGISTRY_ADDRESS
    );
    if (events.length > 0) {
      findings.push(
        Finding.fromObject({
          name: "🚨 NO Registry: Signing keys removed",
          description: `${events.length} signing keys removed`,
          alertId: "NODE-OPERATORS-KEYS-REMOVED",
          severity: FindingSeverity.High,
          type: FindingType.Info,
        })
      );
    }
  }
}

function handleStakeLimitSet(txEvent: TransactionEvent, findings: Finding[]) {
  if (NODE_OPERATORS_REGISTRY_ADDRESS in txEvent.addresses) {
    const noLimitEvents = txEvent.filterLog(
      NODE_OPERATOR_VETTED_KEYS_COUNT_EVENT,
      NODE_OPERATORS_REGISTRY_ADDRESS
    );
    const motionEnactedEvents = txEvent.filterLog(
      MOTION_ENACTED_EVENT,
      EASY_TRACK_ADDRESS
    );
    noLimitEvents.forEach((event) => {
      if (motionEnactedEvents.length < 1) {
        findings.push(
          Finding.fromObject({
            name: "🚨 NO Vetted keys set by NON-EasyTrack action",
            description: `Vetted keys count for node operator ${event.args.nodeOperatorId} was set to ${event.args.approvedValidatorsCount} by NON-EasyTrack motion!`,
            alertId: "NODE-OPERATORS-VETTED-KEYS-SET",
            severity: FindingSeverity.High,
            type: FindingType.Info,
          })
        );
      }
    });
  }
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleStuckPenaltyEnd(blockEvent, findings);

  return findings;
}

async function handleStuckPenaltyEnd(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  let description = "";
  let closestPenaltyEndTimestamp = 0;
  const now = Number(blockEvent.block.timestamp);
  for (const [id, digest] of nodeOperatorDigests.entries()) {
    const { stuck, refunded, stuckPenaltyEndTimestamp } = digest;
    if (
      refunded >= stuck &&
      stuckPenaltyEndTimestamp > 0 &&
      stuckPenaltyEndTimestamp < blockEvent.block.timestamp
    ) {
      if (stuckPenaltyEndTimestamp > closestPenaltyEndTimestamp) {
        closestPenaltyEndTimestamp = stuckPenaltyEndTimestamp;
      }
      const delay = blockEvent.block.timestamp - stuckPenaltyEndTimestamp;
      description += `Operator ID: ${id}: penalty ended ${formatDelay(
        delay
      )} ago\n`;
    }
  }
  if (
    (closestPenaltyEndTimestamp != 0 &&
      now - lastPenaltyEndTimestampAlertTimestamp >
        STUCK_PENALTY_ENDED_TRIGGER_PERIOD) ||
    closestPenaltyEndTimestamp > lastAlertedClosestPenaltyEndTimestamp
  ) {
    description += "\nNote: don't forget to call `clearNodeOperatorPenalty`";
    findings.push(
      Finding.fromObject({
        name: "ℹ️ NO Registry: operator stuck penalty ended",
        description: description,
        alertId: "NODE-OPERATORS-STUCK-PENALTY-ENDED",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
    lastAlertedClosestPenaltyEndTimestamp = closestPenaltyEndTimestamp;
    lastPenaltyEndTimestampAlertTimestamp = now;
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
