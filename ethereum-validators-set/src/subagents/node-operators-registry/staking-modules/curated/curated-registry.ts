import { ethers } from "forta-agent";
import { ethersProvider } from "../../../../ethers";
import NODE_OPERATORS_REGISTRY_ABI from "../../../../abi/NodeOperatorsRegistry.json";
import { BaseRegistryModuleContext } from "../base-node-operators-registry";
import { NodeOperatorModuleParams } from "../interfaces";
import { getEventsOfNoticeForStakingModule } from "./events-of-notice";

export class CuratedRegistryModuleContext extends BaseRegistryModuleContext {
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

  async fetchOperatorName(operatorId: string, block: number): Promise<string> {
    const nodeOperatorsRegistry = new ethers.Contract(
      this.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );
    const { name } = await nodeOperatorsRegistry.getNodeOperator(
      operatorId,
      true,
      { blockTag: block },
    );
    return name;
  }
}
