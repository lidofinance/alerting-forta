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
import { getEventsOfNoticeForStakingModule } from "./utils";
import BigNumber from "bignumber.js";
const {
  EASY_TRACK_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  MOTION_ENACTED_EVENT,
  SIGNING_KEY_REMOVED_EVENT,
  NODE_OPERATOR_VETTED_KEYS_COUNT_EVENT,
  STAKING_MODULES,
  NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT,
  NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT,
  NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD,
  NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD,
  STUCK_PENALTY_ENDED_TRIGGER_PERIOD,
  BLOCK_INTERVAL,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge,
);

export const name = "NodeOperatorsRegistry";

interface NodeOperatorShortDigest {
  stuck: number;
  refunded: number;
  exited: number;
  isStuckRefunded: boolean;
  stuckPenaltyEndTimestamp: number;
}

interface EventsOfNotice {
  address: string;
  event: string;
  alertId: string;
  description: (args: any, names: Map<number, string>) => string;
  severity: FindingSeverity;
}

interface NodeOperatorModuleParams {
  moduleId: number;
  moduleAddress: string;
  alertPrefix: string;
  moduleName: string;
  eventsOfNotice: EventsOfNotice[];
}

class NodeOperatorsRegistryModuleContext {
  public nodeOperatorDigests = new Map<string, NodeOperatorShortDigest>();
  public nodeOperatorNames = new Map<number, string>();
  public closestPenaltyEndTimestamp = 0;
  public penaltyEndAlertTriggeredAt = 0;

  constructor(
    public readonly params: NodeOperatorModuleParams,
    private readonly stakingRouter: ethers.Contract,
  ) {}

  async initialize(currentBlock: number) {
    const nodeOperatorRegistry = new ethers.Contract(
      this.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );

    const [operators] =
      await this.stakingRouter.functions.getAllNodeOperatorDigests(
        this.params.moduleId,
        { blockTag: currentBlock },
      );

    const operatorsSummaries = await Promise.all(
      operators.map((digest: any) =>
        nodeOperatorRegistry.functions.getNodeOperatorSummary(digest.id, {
          blockTag: currentBlock,
        }),
      ),
    );

    const stuckOperatorsEndTimestampMap = new Map<String, number>(
      operators.map((digest: any, index: number) => [
        String(digest.id),
        Number(operatorsSummaries[index].stuckPenaltyEndTimestamp),
      ]),
    );

    for (const digest of operators) {
      this.nodeOperatorDigests.set(String(digest.id), {
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

    await this.updateNodeOperatorsNames(currentBlock);
  }

  async updateNodeOperatorsNames(block: number) {
    const nodeOperatorsRegistry = new ethers.Contract(
      this.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );

    const [operators] =
      await this.stakingRouter.functions.getAllNodeOperatorDigests(
        this.params.moduleId,
        { blockTag: block },
      );

    await Promise.all(
      operators.map(async (operator: any) => {
        const { name } = await nodeOperatorsRegistry.getNodeOperator(
          String(operator.id),
          true,
          { blockTag: block },
        );
        this.nodeOperatorNames.set(Number(operator.id), name);
      }),
    );
  }
}

const stakingModulesOperatorRegistry: NodeOperatorsRegistryModuleContext[] = [];

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const stakingRouter = new ethers.Contract(
    STAKING_ROUTER_ADDRESS,
    STAKING_ROUTER_ABI,
    ethersProvider,
  );

  stakingModulesOperatorRegistry.length = 0;

  const moduleIds: { stakingModuleIds: BigNumber[] } =
    await stakingRouter.functions.getStakingModuleIds({
      blockTag: currentBlock,
    });

  for (const {
    moduleId,
    moduleAddress,
    moduleName,
    alertPrefix,
  } of STAKING_MODULES) {
    if (!moduleId) {
      console.log(`${moduleName} is not supported on this network for ${name}`);
      continue;
    }

    const moduleExists = moduleIds.stakingModuleIds.some(
      (stakingModuleId) => stakingModuleId.toString() === moduleId.toString(),
    );
    if (!moduleExists) {
      continue;
    }

    stakingModulesOperatorRegistry.push(
      new NodeOperatorsRegistryModuleContext(
        {
          moduleId,
          moduleAddress,
          moduleName,
          alertPrefix,
          eventsOfNotice: getEventsOfNoticeForStakingModule({
            moduleId,
            moduleAddress,
            moduleName,
            alertPrefix,
          }),
        },
        stakingRouter,
      ),
    );
  }

  await Promise.all(
    stakingModulesOperatorRegistry.map((nodeOperatorRegistry) =>
      nodeOperatorRegistry.initialize(currentBlock),
    ),
  );

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  stakingModulesOperatorRegistry.forEach((norContext) => {
    handleEventsOfNotice(txEvent, findings, norContext.params.eventsOfNotice);

    const stuckEvents = txEvent.filterLog(
      NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT,
      norContext.params.moduleAddress,
    );

    // the order is important
    handleExitedCountChanged(txEvent, stuckEvents, findings, norContext);
    handleStuckStateChanged(stuckEvents, findings, norContext);

    handleSigningKeysRemoved(txEvent, findings, norContext);
    handleStakeLimitSet(txEvent, findings, norContext);
  });

  return findings;
}

function handleExitedCountChanged(
  txEvent: TransactionEvent,
  stuckEvents: LogDescription[],
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  const exitEvents = txEvent.filterLog(
    NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT,
    norContext.params.moduleAddress,
  );
  if (!exitEvents) return;
  for (const exit of exitEvents) {
    const { nodeOperatorId, exitedValidatorsCount } = exit.args;
    const lastDigest = norContext.nodeOperatorDigests.get(
      String(nodeOperatorId),
    ) as NodeOperatorShortDigest;
    const newExited = Number(exitedValidatorsCount) - lastDigest.exited;
    if (newExited > NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ ${norContext.params.moduleName} NO Registry: operator exited more than ${NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD} validators`,
          description: `Operator: ${nodeOperatorId} ${norContext.nodeOperatorNames.get(
            Number(nodeOperatorId),
          )}\nNew exited: ${newExited}`,
          alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-BIG-EXIT`,
          severity: FindingSeverity.Info,
          type: FindingType.Info,
        }),
      );
    }
    let actualStuckCount = lastDigest.stuck;
    if (newExited > 0) {
      const stuckEvent = stuckEvents.find(
        (e: any) => String(e.args.nodeOperatorId) == String(nodeOperatorId),
      );
      actualStuckCount = stuckEvent
        ? Number(stuckEvent.args.stuckValidatorsCount)
        : lastDigest.stuck;
      if (lastDigest.stuck > 0 && actualStuckCount == 0) {
        findings.push(
          Finding.fromObject({
            name: `ℹ️ ${norContext.params.moduleName} NO Registry: operator exited all stuck keys 🎉`,
            description: `Operator: ${nodeOperatorId} ${norContext.nodeOperatorNames.get(
              Number(nodeOperatorId),
            )}\nStuck exited: ${lastDigest.stuck}`,
            alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-ALL-STUCK-EXITED`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
          }),
        );
      } else if (lastDigest.stuck - actualStuckCount > 0) {
        findings.push(
          Finding.fromObject({
            name: `ℹ️ ${norContext.params.moduleName} NO Registry: operator exited some stuck keys`,
            description: `Operator: ${nodeOperatorId} ${norContext.nodeOperatorNames.get(
              Number(nodeOperatorId),
            )}\nStuck exited: ${lastDigest.stuck - actualStuckCount} of ${
              lastDigest.stuck
            }`,
            alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-ALL-STUCK-EXITED`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
          }),
        );
      }
    }
    norContext.nodeOperatorDigests.set(String(nodeOperatorId), {
      ...lastDigest,
      exited: Number(exitedValidatorsCount),
    });
  }
}

function handleStuckStateChanged(
  events: LogDescription[],
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  if (!events) return;
  for (const event of events) {
    const { nodeOperatorId, stuckValidatorsCount, refundedValidatorsCount } =
      event.args;
    const lastDigest = norContext.nodeOperatorDigests.get(
      String(nodeOperatorId),
    ) as NodeOperatorShortDigest;
    const newStuck = Number(stuckValidatorsCount) - lastDigest.stuck;
    if (newStuck > 0) {
      if (newStuck > NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD) {
        findings.push(
          Finding.fromObject({
            name: `⚠️ ${norContext.params.moduleName} NO Registry: operator have new stuck keys`,
            description: `Operator: ${nodeOperatorId} ${norContext.nodeOperatorNames.get(
              Number(nodeOperatorId),
            )}\nNew stuck: ${stuckValidatorsCount}`,
            alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-NEW-STUCK-KEYS`,
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          }),
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
            name: `ℹ️ ${norContext.params.moduleName} NO Registry: operator refunded all stuck keys 🎉`,
            description: `Operator: ${nodeOperatorId} ${norContext.nodeOperatorNames.get(
              Number(nodeOperatorId),
            )}\nRefunded: ${refundedValidatorsCount}`,
            alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-ALL-STUCK-REFUNDED`,
            severity: FindingSeverity.Info,
            type: FindingType.Info,
          }),
        );
      }
    }
    norContext.nodeOperatorDigests.set(String(nodeOperatorId), {
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
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  const moduleAddress = norContext.params.moduleAddress;
  if (moduleAddress in txEvent.addresses) {
    let digest = new Map<string, number>();
    const events = txEvent.filterLog(SIGNING_KEY_REMOVED_EVENT, moduleAddress);
    if (events.length > 0) {
      events.forEach((event) => {
        const noName =
          norContext.nodeOperatorNames.get(Number(event.args.operatorId)) ||
          "undefined";
        const keysCount = digest.get(noName) || 0;
        digest.set(noName, keysCount + 1);
      });
      findings.push(
        Finding.fromObject({
          name: `🚨 ${norContext.params.moduleName} NO Registry: Signing keys removed`,
          description:
            `Signing keys has been removed for:` +
            `\n ${Array.from(digest.entries())
              .map(([name, count]) => `${name}: ${count}`)
              .join("\n")}`,
          alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-KEYS-REMOVED`,
          severity: FindingSeverity.High,
          type: FindingType.Info,
        }),
      );
    }
  }
}

function handleStakeLimitSet(
  txEvent: TransactionEvent,
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  const moduleAddress = norContext.params.moduleAddress;
  if (moduleAddress in txEvent.addresses) {
    const noLimitEvents = txEvent.filterLog(
      NODE_OPERATOR_VETTED_KEYS_COUNT_EVENT,
      moduleAddress,
    );
    const motionEnactedEvents = txEvent.filterLog(
      MOTION_ENACTED_EVENT,
      EASY_TRACK_ADDRESS,
    );
    noLimitEvents.forEach((event) => {
      if (motionEnactedEvents.length < 1) {
        const { nodeOperatorId, approvedValidatorsCount } = event.args;
        findings.push(
          Finding.fromObject({
            name: `🚨 ${norContext.params.moduleName} NO Vetted keys set by NON-EasyTrack action`,
            description: `Vetted keys count for node operator [${nodeOperatorId} ${norContext.nodeOperatorNames.get(
              Number(nodeOperatorId),
            )}] was set to ${approvedValidatorsCount} by NON-EasyTrack motion!`,
            alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-VETTED-KEYS-SET`,
            severity: FindingSeverity.High,
            type: FindingType.Info,
          }),
        );
      }
    });
  }
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (blockEvent.blockNumber % BLOCK_INTERVAL == 0) {
    // every 100 blocks for sync between nodes
    const stuckPenaltyHandlers = stakingModulesOperatorRegistry.map(
      (nodeOperatorRegistry) =>
        handleStuckPenaltyEnd(blockEvent, findings, nodeOperatorRegistry),
    );
    const nodeOperatorsNamesUpdaters = stakingModulesOperatorRegistry.map(
      (nodeOperatorRegistry) =>
        nodeOperatorRegistry.updateNodeOperatorsNames(blockEvent.blockNumber),
    );

    await Promise.all([...stuckPenaltyHandlers, ...nodeOperatorsNamesUpdaters]);
  }

  return findings;
}

async function handleStuckPenaltyEnd(
  blockEvent: BlockEvent,
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  let description = "";
  let currentClosestPenaltyEndTimestamp = 0;
  const now = Number(blockEvent.block.timestamp);
  for (const [id, digest] of norContext.nodeOperatorDigests.entries()) {
    const { stuck, refunded, stuckPenaltyEndTimestamp } = digest;
    if (
      refunded >= stuck &&
      stuckPenaltyEndTimestamp > 0 &&
      stuckPenaltyEndTimestamp < blockEvent.block.timestamp
    ) {
      if (stuckPenaltyEndTimestamp > currentClosestPenaltyEndTimestamp) {
        currentClosestPenaltyEndTimestamp = stuckPenaltyEndTimestamp;
      }
      const delay = blockEvent.block.timestamp - stuckPenaltyEndTimestamp;
      description += `Operator: ${id} ${norContext.nodeOperatorNames.get(
        Number(id),
      )} penalty ended ${formatDelay(delay)} ago\n`;
    }
  }
  if (
    (currentClosestPenaltyEndTimestamp != 0 &&
      now - norContext.penaltyEndAlertTriggeredAt >
        STUCK_PENALTY_ENDED_TRIGGER_PERIOD) ||
    currentClosestPenaltyEndTimestamp > norContext.closestPenaltyEndTimestamp
  ) {
    description += "\nNote: don't forget to call `clearNodeOperatorPenalty`";
    findings.push(
      Finding.fromObject({
        name: `ℹ️ ${norContext.params.moduleName} NO Registry: operator stuck penalty ended`,
        description: description,
        alertId: `${norContext.params.alertPrefix}NODE-OPERATORS-STUCK-PENALTY-ENDED`,
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      }),
    );
    norContext.closestPenaltyEndTimestamp = currentClosestPenaltyEndTimestamp;
    norContext.penaltyEndAlertTriggeredAt = now;
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  handleBlock,
  // initialize, // sdk won't provide any arguments to the function
};
