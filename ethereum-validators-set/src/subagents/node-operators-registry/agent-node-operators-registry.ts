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
import OBOL_LIDO_SPLIT_FACTORY_ABI from "../../abi/obol-splits/ObolLidoSplitFactory.json";
import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";
import { ethersProvider } from "../../ethers";
import { getEventsOfNoticeForStakingModule } from "./utils";
import BigNumber from "bignumber.js";
import { NodeOperatorFullInfo } from "../../common/interfaces";
const {
  EASY_TRACK_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  MOTION_ENACTED_EVENT,
  SIGNING_KEY_REMOVED_EVENT,
  NODE_OPERATOR_VETTED_KEYS_COUNT_EVENT,
  STAKING_MODULES,
  SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID,
  NODE_OPERATORS_REGISTRY_EXITED_CHANGED_EVENT,
  NODE_OPERATORS_REGISTRY_STUCK_CHANGED_EVENT,
  NODE_OPERATOR_BIG_EXITED_COUNT_THRESHOLD,
  NODE_OPERATOR_NEW_STUCK_KEYS_THRESHOLD,
  NODE_OPERATOR_REWARD_ADDRESS_SET_EVENT,
  OBOL_LIDO_SPLIT_FACTORY_CLUSTERS,
  STUCK_PENALTY_ENDED_TRIGGER_PERIOD,
  BLOCK_INTERVAL,
  TARGET_SHARE_THRESHOLD_NOTICE,
  TARGET_SHARE_THRESHOLD_PANIC,
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

class ObolLidoSplitFactoryCluster {
  public readonly contract: ethers.Contract;

  constructor(
    public readonly clusterName: string,
    public readonly contractAddress: string,
  ) {
    this.contract = new ethers.Contract(
      contractAddress,
      OBOL_LIDO_SPLIT_FACTORY_ABI,
      ethersProvider,
    );
  }
}

class NodeOperatorsRegistryModuleContext {
  public nodeOperatorDigests = new Map<string, NodeOperatorShortDigest>();
  public nodeOperatorNames = new Map<number, NodeOperatorFullInfo>();
  public closestPenaltyEndTimestamp = 0;
  public penaltyEndAlertTriggeredAt = 0;
  public readonly contract: ethers.Contract;

  constructor(
    public readonly params: NodeOperatorModuleParams,
    private readonly stakingRouter: ethers.Contract,
  ) {
    this.contract = new ethers.Contract(
      this.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );
  }

  async initialize(currentBlock: number) {
    const [operators] =
      await this.stakingRouter.functions.getAllNodeOperatorDigests(
        this.params.moduleId,
        { blockTag: currentBlock },
      );

    const operatorsSummaries = await Promise.all(
      operators.map((digest: any) =>
        this.contract.functions.getNodeOperatorSummary(digest.id, {
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

  getOperatorName(nodeOperatorId: string): string {
    return (
      this.nodeOperatorNames.get(Number(nodeOperatorId))?.name ?? "undefined"
    );
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
        const { name, rewardAddress } =
          await nodeOperatorsRegistry.getNodeOperator(
            String(operator.id),
            true,
            { blockTag: block },
          );
        this.nodeOperatorNames.set(Number(operator.id), {
          name,
          rewardAddress,
        });
      }),
    );
  }
}

const stakingModulesOperatorRegistry: NodeOperatorsRegistryModuleContext[] = [];
const stakingRouter = new ethers.Contract(
  STAKING_ROUTER_ADDRESS,
  STAKING_ROUTER_ABI,
  ethersProvider,
);
const clusterSplitWalletFactories: ObolLidoSplitFactoryCluster[] = [];

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  stakingModulesOperatorRegistry.length = 0;

  const moduleIds: { stakingModuleIds: BigNumber[] } =
    await stakingRouter.functions.getStakingModuleIds({
      blockTag: currentBlock,
    });

  for (const {
    clusterName,
    factoryAddress,
  } of OBOL_LIDO_SPLIT_FACTORY_CLUSTERS) {
    clusterSplitWalletFactories.push(
      new ObolLidoSplitFactoryCluster(clusterName, factoryAddress),
    );
  }

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
    handleSetRewardAddress(txEvent, findings, norContext);
  });

  return findings;
}

async function handleSetRewardAddress(
  txEvent: TransactionEvent,
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  if (
    norContext.params.moduleId !== SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID
  ) {
    return;
  }

  const setRewardAddressEvents = txEvent.filterLog(
    NODE_OPERATOR_REWARD_ADDRESS_SET_EVENT,
    norContext.params.moduleAddress,
  );

  if (!setRewardAddressEvents.length) {
    return;
  }

  const rewardAddressNodeOperatorMap = new Map<string, string>();
  for (const { name, rewardAddress } of norContext.nodeOperatorNames.values()) {
    rewardAddressNodeOperatorMap.set(rewardAddress, name);
  }

  for (const event of setRewardAddressEvents) {
    const [nodeOperatorId, newRewardAddress] = event.args;
    const existingNodeOperatorName =
      rewardAddressNodeOperatorMap.get(newRewardAddress);
    if (existingNodeOperatorName) {
      findings.push(
        Finding.from({
          alertId: `DUPLICATE-REWARD-ADDRESS-SET-UP`,
          name: `⚠️ SimpleDVT NOR: Reward address already in use"`,
          description: `RewardAddress (${newRewardAddress}) already set up for "${existingNodeOperatorName}"`,
          severity: FindingSeverity.High,
          type: FindingType.Info,
        }),
      );
    }

    let isCreatedViaSplitFactory = false;
    for (const splitWalletFactory of clusterSplitWalletFactories) {
      isCreatedViaSplitFactory = await isRewardAddressCreatedViaSplitFactory(
        newRewardAddress,
        splitWalletFactory,
      );

      if (isCreatedViaSplitFactory) {
        break;
      }
    }

    if (!isCreatedViaSplitFactory) {
      const simpleDvtModule = stakingModulesOperatorRegistry.find(
        (nor) =>
          nor.params.moduleId === SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID,
      );
      const norName = simpleDvtModule?.getOperatorName(nodeOperatorId);

      findings.push(
        Finding.from({
          alertId: `INCORRECT-REWARD-ADDRESS`,
          name: `⚠️ SimpleDVT NOR: Incorrect Reward address provided"`,
          description: `RewardAddress (${newRewardAddress}) for NOR #${nodeOperatorId}(${norName}) created not via SplitFactory`,
          severity: FindingSeverity.High,
          type: FindingType.Info,
        }),
      );
    }
  }

  for (const stakingModule of stakingModulesOperatorRegistry) {
    await stakingModule.updateNodeOperatorsNames(txEvent.blockNumber);
  }
}

async function isRewardAddressCreatedViaSplitFactory(
  newRewardAddress: string,
  splitWalletFactory: ObolLidoSplitFactoryCluster,
): Promise<boolean> {
  const filterCreateObolLidoSplit =
    splitWalletFactory.contract.filters.CreateObolLidoSplit();
  const createObolLidoSplitEvents =
    await splitWalletFactory.contract.queryFilter(filterCreateObolLidoSplit);

  const createRewardAddressEvent = createObolLidoSplitEvents.find(
    (event) => event.args?.[0] === newRewardAddress,
  );
  if (createRewardAddressEvent) {
    return true;
  }

  return false;
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
          description: `Operator: #${nodeOperatorId} ${norContext.getOperatorName(
            nodeOperatorId,
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
            description: `Operator: #${nodeOperatorId} ${norContext.getOperatorName(
              nodeOperatorId,
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
            description: `Operator: #${nodeOperatorId} ${norContext.getOperatorName(
              nodeOperatorId,
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
            description: `Operator: #${nodeOperatorId} ${norContext.getOperatorName(
              nodeOperatorId,
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
            description: `Operator: #${nodeOperatorId} ${norContext.getOperatorName(
              nodeOperatorId,
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
        const noName = norContext.getOperatorName(event.args.operatorId);
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
            description: `Vetted keys count for node operator [#${nodeOperatorId} ${norContext.getOperatorName(
              nodeOperatorId,
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
    const factTargetShareHandlers = stakingModulesOperatorRegistry.map(
      (nodeOperatorRegistry) =>
        handleFactTargetShare(blockEvent, findings, nodeOperatorRegistry),
    );
    const nodeOperatorsNamesUpdaters = stakingModulesOperatorRegistry.map(
      (nodeOperatorRegistry) =>
        nodeOperatorRegistry.updateNodeOperatorsNames(blockEvent.blockNumber),
    );

    await Promise.all([
      ...stuckPenaltyHandlers,
      ...nodeOperatorsNamesUpdaters,
      ...factTargetShareHandlers,
    ]);
  }

  return findings;
}

async function handleFactTargetShare(
  blockEvent: BlockEvent,
  findings: Finding[],
  norContext: NodeOperatorsRegistryModuleContext,
) {
  const activeValidatorsCountResponse =
    await stakingRouter.functions.getStakingModuleActiveValidatorsCount(
      norContext.params.moduleId,
      {
        blockTag: blockEvent.blockNumber,
      },
    );
  const [stModule] = await stakingRouter.functions.getStakingModule(
    norContext.params.moduleId,
    {
      blockTag: blockEvent.blockNumber,
    },
  );
  const targetShare = stModule.targetShare;
  const routerActiveValidatorsCount = (
    activeValidatorsCountResponse.activeValidatorsCount as BigNumber
  ).toNumber();
  const summary = await norContext.contract.getStakingModuleSummary();
  const totalDepositedValidators = (
    summary.totalDepositedValidators as BigNumber
  ).toNumber();
  const totalExitedValidators = (
    summary.totalExitedValidators as BigNumber
  ).toNumber();
  const moduleActiveValidators =
    totalDepositedValidators - totalExitedValidators;

  let factTargetShare = targetShare;
  if (routerActiveValidatorsCount > moduleActiveValidators) {
    factTargetShare = moduleActiveValidators / routerActiveValidatorsCount;
  } else if (routerActiveValidatorsCount < moduleActiveValidators) {
    factTargetShare = routerActiveValidatorsCount / moduleActiveValidators;
  } else {
    return;
  }

  const multiplier = 10_000;
  const diffTargetShare =
    (1 - Math.abs(factTargetShare - targetShare)) * multiplier;

  const title = `Actual target exceeded ${Math.ceil(diffTargetShare) / 100}%%`;
  const description = `The module has ${moduleActiveValidators} active validators against ${routerActiveValidatorsCount} at Staking Router`;
  if (diffTargetShare > TARGET_SHARE_THRESHOLD_PANIC) {
    findings.push(
      Finding.fromObject({
        name: `🚨 ${norContext.params.moduleName} NO Registry: ${title}`,
        description,
        alertId: `${norContext.params.alertPrefix}TARGET-SHARE-PANIC`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      }),
    );
    return;
  }

  if (diffTargetShare > TARGET_SHARE_THRESHOLD_NOTICE) {
    findings.push(
      Finding.fromObject({
        name: `⚠️ ${norContext.params.moduleName} NO Registry: ${title}`,
        description,
        alertId: `${norContext.params.alertPrefix}TARGET-SHARE-NOTICE`,
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      }),
    );
  }
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
      description += `Operator: ${id} ${norContext.getOperatorName(
        id,
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
