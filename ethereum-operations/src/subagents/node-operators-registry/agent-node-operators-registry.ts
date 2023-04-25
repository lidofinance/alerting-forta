import {
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  LogDescription,
  TransactionEvent,
} from "forta-agent";

import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";
import STAKING_ROUTER_ABI from "../../abi/StakingRouter.json";
import { ethersProvider } from "../../ethers";
const {
  NODE_OPERATOR_REGISTRY_MODULE_ID,
  NODE_OPERATORS_REGISTRY_ADDRESS,
  EASY_TRACK_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  MOTION_ENACTED_EVENT,
  SIGNING_KEY_REMOVED_EVENT,
  NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
  NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE,
  NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT,
  NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT,
  NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD,
  NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

export const name = "NodeOperatorsRegistry";

interface NodeOperatorShortDigest {
  stuck: number;
  refunded: number;
  exited: number;
  isStuckRefunded: boolean;
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

  try {
    const [operators] = await stakingRouter.functions.getAllNodeOperatorDigests(
      NODE_OPERATOR_REGISTRY_MODULE_ID,
      { blockTag: currentBlock }
    );

    operators.forEach((digest: any) =>
      nodeOperatorDigests.set(String(digest.id), {
        stuck: Number(digest.summary.stuckValidatorsCount),
        refunded: Number(digest.summary.refundedValidatorsCount),
        exited: Number(digest.summary.totalExitedValidators),
        isStuckRefunded:
          Number(digest.summary.refundedValidatorsCount) >=
          Number(digest.summary.stuckValidatorsCount),
      })
    );
  } catch (e: any) {
    // cant get node operators digests because is not deployed yet or something else
    initFindings.push(
      Finding.fromObject({
        name: "StakingRouter.getAllNodeOperatorDigests error",
        description: "Probably StakingRouter is not deployed yet",
        alertId: "STAKING-ROUTER-NOT-DEPLOYED",
        severity: FindingSeverity.Info,
        type: FindingType.Suspicious,
        metadata: {
          stack: e.message,
        },
      })
    );
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
          description: `ID: ${nodeOperatorId}\nNew exited: ${newExited}`,
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
            description: `ID: ${nodeOperatorId}\nStuck exited: ${lastDigest.stuck}`,
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
            description: `ID: ${nodeOperatorId}\nNew stuck: ${stuckValidatorsCount}`,
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
            description: `ID: ${nodeOperatorId}\nRefunded: ${refundedValidatorsCount}`,
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
      NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
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
            name: "🚨 NO Stake limit set by NON-EasyTrack action",
            description: `Staking limit for node operator ${event.args.id} was set to ${event.args.stakingLimit} by NON-EasyTrack motion!`,
            alertId: "NODE-OPERATORS-STAKING-LIMIT-SET",
            severity: FindingSeverity.High,
            type: FindingType.Info,
          })
        );
      }
    });
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
