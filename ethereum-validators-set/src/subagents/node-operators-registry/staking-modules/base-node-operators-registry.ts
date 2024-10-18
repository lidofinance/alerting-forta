import { ethers } from "forta-agent";
import { NodeOperatorFullInfo } from "../../../common/staking-modules/interfaces";
import {
  EventsOfNotice,
  NodeOperatorModuleParams,
  NodeOperatorShortDigest,
} from "./interfaces";
import { BaseRegistryModule } from "../../../common/staking-modules/base-node-operators-registry";

export abstract class BaseRegistryModuleContext extends BaseRegistryModule<NodeOperatorModuleParams> {
  public nodeOperatorDigests = new Map<string, NodeOperatorShortDigest>();
  public nodeOperatorNames = new Map<number, NodeOperatorFullInfo>();
  public closestPenaltyEndTimestamp = 0;
  public penaltyEndAlertTriggeredAt = 0;
  public stakeShareLimit: number = 0;

  constructor(
    public readonly params: NodeOperatorModuleParams,
    public readonly eventsOfNotice: EventsOfNotice[],
    protected readonly stakingRouter: ethers.Contract,
  ) {
    super(params, stakingRouter);
  }

  async initialize(currentBlock: number) {
    const operatorsMap = await super.initialize(currentBlock);

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

    return operatorsMap;
  }

  abstract fetchOperatorName(
    operatorId: string,
    block: number,
  ): Promise<string>;

  async updateNodeOperatorsInfo(block: number) {
    const [srModule] = await this.stakingRouter.functions.getStakingModule(
      this.params.moduleId,
      { blockTag: block },
    );
    this.stakeShareLimit = srModule.stakeShareLimit;

    return super.updateNodeOperatorsInfo(block);
  }
}
