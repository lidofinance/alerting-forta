import { BaseRegistryModule } from "./base-node-operators-registry";
import { NodeOperatorModuleParams } from "./interfaces";

export class CuratedRegistryModule extends BaseRegistryModule<NodeOperatorModuleParams> {
  async fetchOperatorName(operatorId: string, block: number): Promise<string> {
    const { name } = await this.contract.getNodeOperator(operatorId, true, {
      blockTag: block,
    });
    return name;
  }
}
