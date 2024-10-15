import { BaseRegistryModuleContext } from "./base-node-operators-registry";

export class CuratedRegistryModuleContext extends BaseRegistryModuleContext {
  async fetchOperatorName(operatorId: string, block: number): Promise<string> {
    const { name } = await this.contract.getNodeOperator(operatorId, true, {
      blockTag: block,
    });
    return name;
  }
}
