import { BaseRegistryModule } from "./base-node-operators-registry";
import { NodeOperatorModuleParams } from "./interfaces";

export class CommunityRegistryModule extends BaseRegistryModule<NodeOperatorModuleParams> {
  async fetchOperatorName(operatorId: string, _block: number): Promise<string> {
    return `CSM Operator #${operatorId}`;
  }
}
