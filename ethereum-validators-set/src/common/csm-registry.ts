import { ethers } from "forta-agent";
import { NodeOperatorRegistryModule, NodeOperatorSummary } from "./interfaces";

export interface CSMOperatorInfo {
  id: number;
  name: string;
  totalAddedKeys: number;
  totalWithdrawnKeys: number;
  totalDepositedKeys: number;
  totalVettedKeys: number;
  stuckValidatorsCount: number;
  depositableValidatorsCount: number;
  targetLimit: number;
  targetLimitMode: number;
  totalExitedKeys: number;
  enqueuedCount: number;
  managerAddress: string;
  proposedManagerAddress: string;
  rewardAddress: string;
  proposedRewardAddress: string;
  extendedManagerPermissions: boolean;
}

export interface NodeOperatorModuleParams {
  moduleId: number;
  moduleAddress: string;
  moduleName: string;
  alertPrefix: string;
}

export class CommunityRegistry
  implements NodeOperatorRegistryModule<CSMOperatorInfo>
{
  protected nodeOperators = new Map<number, CSMOperatorInfo>();

  constructor(
    public readonly params: NodeOperatorModuleParams,
    public readonly stakingRouter: ethers.Contract,
    public readonly registryContract: ethers.Contract,
  ) {}

  async getOperatorById(
    operatorId: string,
    block: number,
  ): Promise<CSMOperatorInfo> {
    const operatorIndex = Number(operatorId);
    let operatorInfo = this.nodeOperators.get(operatorIndex);
    if (operatorInfo) {
      return operatorInfo;
    }

    const [csmOperatorInfoResponse] =
      await this.registryContract.getNodeOperator(String(operatorId), true, {
        blockTag: block,
      });

    const csmOperatorInfo: CSMOperatorInfo = {
      id: operatorIndex,
      name: `CSM Operator #${operatorIndex}`,
      totalAddedKeys: csmOperatorInfoResponse[0],
      totalWithdrawnKeys: csmOperatorInfoResponse[1],
      totalDepositedKeys: csmOperatorInfoResponse[2],
      totalVettedKeys: csmOperatorInfoResponse[3],
      stuckValidatorsCount: csmOperatorInfoResponse[4],
      depositableValidatorsCount: csmOperatorInfoResponse[5],
      targetLimit: csmOperatorInfoResponse[6],
      targetLimitMode: csmOperatorInfoResponse[7],
      totalExitedKeys: csmOperatorInfoResponse[8],
      enqueuedCount: csmOperatorInfoResponse[9],
      managerAddress: csmOperatorInfoResponse[10],
      proposedManagerAddress: csmOperatorInfoResponse[11],
      rewardAddress: csmOperatorInfoResponse[12],
      proposedRewardAddress: csmOperatorInfoResponse[13],
      extendedManagerPermissions: csmOperatorInfoResponse[14],
    };

    this.nodeOperators.set(operatorIndex, csmOperatorInfo);

    return csmOperatorInfo;
  }

  resetOperators(): void {
    this.nodeOperators.clear();
  }
}
