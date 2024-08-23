import { ethers } from "forta-agent";
import { NodeOperatorFullInfo } from "../../../common/interfaces";
import {
  EventsOfNotice,
  NodeOperatorModuleParams,
  NodeOperatorShortDigest,
} from "./interfaces";
import NODE_OPERATORS_REGISTRY_ABI from "../../../abi/NodeOperatorsRegistry.json";
import { ethersProvider } from "../../../ethers";
import BigNumber from "bignumber.js";

export abstract class BaseRegistryModuleContext {
  public nodeOperatorDigests = new Map<string, NodeOperatorShortDigest>();
  public nodeOperatorNames = new Map<number, NodeOperatorFullInfo>();
  public closestPenaltyEndTimestamp = 0;
  public penaltyEndAlertTriggeredAt = 0;
  public stakeShareLimit: number = 0;
  public readonly contract: ethers.Contract;
  protected readonly batchSize = 20;

  constructor(
    public readonly params: NodeOperatorModuleParams,
    public readonly eventsOfNotice: EventsOfNotice[],
    protected readonly stakingRouter: ethers.Contract,
  ) {
    this.contract = new ethers.Contract(
      this.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );
  }

  async initialize(currentBlock: number) {
    const operatorsMap = await this.fetchAllNodeOperatorSummaries(currentBlock);

    for (const [operatorId, summary] of operatorsMap.entries()) {
      this.nodeOperatorDigests.set(String(operatorId), {
        stuck: Number(summary.stuckValidatorsCount),
        refunded: Number(summary.refundedValidatorsCount),
        exited: Number(summary.totalExitedValidators),
        isStuckRefunded:
          Number(summary.refundedValidatorsCount) >=
          Number(summary.stuckValidatorsCount),
        stuckPenaltyEndTimestamp: Number(summary.stuckPenaltyEndTimestamp),
      });
    }

    await this.updateNodeOperatorsInfo(currentBlock);
  }

  getOperatorName(nodeOperatorId: string): string {
    return (
      this.nodeOperatorNames.get(Number(nodeOperatorId))?.name ?? "undefined"
    );
  }

  abstract fetchOperatorName(
    operatorId: string,
    block: number,
  ): Promise<string>;

  async updateNodeOperatorsInfo(block: number) {
    const operatorsMap = await this.fetchAllNodeOperatorSummaries(block);

    const [srModule] = await this.stakingRouter.functions.getStakingModule(
      this.params.moduleId,
      { blockTag: block },
    );
    this.stakeShareLimit = srModule.stakeShareLimit;

    await Promise.all(
      Array.from(operatorsMap.keys()).map(async (operatorId: string) => {
        const name = await this.fetchOperatorName(operatorId, block);
        const rewardAddress =
          this.nodeOperatorNames.get(Number(operatorId))?.rewardAddress || "";
        this.nodeOperatorNames.set(Number(operatorId), {
          name,
          rewardAddress,
        });
      }),
    );
  }

  protected async fetchAllNodeOperatorSummaries(
    currentBlock: number,
  ): Promise<Map<string, any>> {
    const operatorsMap = new Map<string, any>();
    const [operatorsCountBN] =
      await this.contract.functions.getNodeOperatorsCount({
        blockTag: currentBlock,
      });
    const operatorsCount = operatorsCountBN.toNumber();

    for (let offset = 0; offset < operatorsCount; offset += this.batchSize) {
      const batchSize = Math.min(this.batchSize, operatorsCount - offset);
      const summaries = await Promise.all(
        Array.from({ length: batchSize }, (_, i) =>
          this.contract.functions.getNodeOperatorSummary(offset + i, {
            blockTag: currentBlock,
          }),
        ),
      );

      summaries.forEach((summary, index) => {
        operatorsMap.set(String(offset + index), summary);
      });
    }

    return operatorsMap;
  }
}
