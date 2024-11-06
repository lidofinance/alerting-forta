import { ethers } from "forta-agent";
import { BaseRegistryModuleContext } from "../base-node-operators-registry";
import { NodeOperatorModuleParams } from "../interfaces";
import { getEventsOfNoticeForStakingModule } from "./events-of-notice";

export class CommunityRegistryModuleContext extends BaseRegistryModuleContext {
  constructor(
    public readonly params: NodeOperatorModuleParams,
    protected readonly stakingRouter: ethers.Contract,
  ) {
    super(
      params,
      getEventsOfNoticeForStakingModule({
        ...params,
      }),
      stakingRouter,
    );
  }

  async fetchOperatorName(operatorId: string, _block: number): Promise<string> {
    return `CSM Operator #${operatorId}`;
  }
}
