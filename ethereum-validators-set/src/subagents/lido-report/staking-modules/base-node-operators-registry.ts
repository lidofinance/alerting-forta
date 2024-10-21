import { NodeOperatorModuleParams } from "../../../common/staking-modules/interfaces";
import { BaseRegistryModule } from "../../../common/staking-modules/base-node-operators-registry";
import { NodeOperatorSummary } from "../../../common/staking-modules/interfaces";

export abstract class BaseRegistryModuleContext extends BaseRegistryModule<NodeOperatorModuleParams> {
  // re-fetched from history on startup
  public lastAllExited = 0;
  public lastAllStuck = 0;
  public lastAllRefunded = 0;

  async initialize(currentBlock: number) {
    const operatorsMap = await super.initialize(currentBlock);

    const { allExited, allStuck, allRefunded } =
      await this.getSummaryDigest(currentBlock);
    this.lastAllExited = allExited;
    this.lastAllStuck = allStuck;
    this.lastAllRefunded = allRefunded;

    return operatorsMap;
  }

  async getSummaryDigest(block: number) {
    const operatorsSummaryMap = await this.updateNodeOperatorsInfo(block);
    return await this.getSummaryDigestFromOperatorsSummary(operatorsSummaryMap);
  }

  protected async getSummaryDigestFromOperatorsSummary(
    operatorsSummaryMap: Map<string, NodeOperatorSummary>,
  ) {
    let allExited = 0;
    let allStuck = 0;
    let allRefunded = 0;

    operatorsSummaryMap.forEach((summary: NodeOperatorSummary) => {
      allStuck += Number(summary.stuckValidatorsCount);
      allRefunded += Number(summary.refundedValidatorsCount);
      allExited += Number(summary.totalExitedValidators);
    });

    return {
      allExited,
      allStuck,
      allRefunded,
    };
  }
}
