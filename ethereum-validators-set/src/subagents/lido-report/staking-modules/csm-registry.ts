import { BaseRegistryModuleContext } from "./base-node-operators-registry";

export class CommunityRegistryModuleContext extends BaseRegistryModuleContext {
  async fetchOperatorName(operatorId: string, _block: number): Promise<string> {
    return `CSM Operator #${operatorId}`;
  }
}
