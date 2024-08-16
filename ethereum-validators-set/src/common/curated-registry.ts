import { ethers } from "forta-agent";
import { NodeOperatorRegistryModule } from "./interfaces";

export interface CuratedOperatorInfo {
  id: string;
  name: string;
  rewardAddress: string;
}

export interface NodeOperatorModuleParams {
  moduleId: number;
  moduleAddress: string;
  moduleName: string;
  alertPrefix: string;
}

export class CuratedRegistry
  implements NodeOperatorRegistryModule<CuratedOperatorInfo>
{
  protected nodeOperators = new Map<number, CuratedOperatorInfo>();

  constructor(
    public readonly params: NodeOperatorModuleParams,
    public readonly stakingRouter: ethers.Contract,
    public readonly registryContract: ethers.Contract,
  ) {}

  async getOperatorById(
    operatorId: string,
    block: number,
  ): Promise<CuratedOperatorInfo> {
    const operatorIndex = Number(operatorId);
    let operatorInfo = this.nodeOperators.get(operatorIndex);
    if (operatorInfo) {
      return operatorInfo;
    }

    const { name, rewardAddress } = await this.registryContract.getNodeOperator(
      String(operatorId),
      true,
      { blockTag: block },
    );

    operatorInfo = {
      id: operatorId,
      name,
      rewardAddress,
    };

    this.nodeOperators.set(operatorIndex, operatorInfo);

    return operatorInfo;
  }

  resetOperators(): void {
    this.nodeOperators.clear();
  }
}
