import { ethers } from "forta-agent";
import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";
import { ethersProvider } from "../../ethers";
import {
  NodeOperatorFullInfo,
  NodeOperatorSummary,
  NodeOperatorModuleParams,
} from "./interfaces";

export abstract class BaseRegistryModule<
  ModuleParams extends NodeOperatorModuleParams,
> {
  public nodeOperatorNames = new Map<number, NodeOperatorFullInfo>();
  public readonly contract: ethers.Contract;
  protected readonly batchSize = 20;

  constructor(
    public readonly params: ModuleParams,
    protected readonly stakingRouter: ethers.Contract,
  ) {
    this.contract = new ethers.Contract(
      this.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );
  }

  async initialize(currentBlock: number) {
    return await this.updateNodeOperatorsInfo(currentBlock);
  }

  getOperatorName(nodeOperatorId: string): string {
    return (
      this.nodeOperatorNames.get(Number(nodeOperatorId))?.name ?? "undefined"
    );
  }

  abstract fetchOperatorName(
    operatorId: string,
    block: number,
  ): Promise<string>;

  async updateNodeOperatorsInfo(block: number) {
    const operatorsMap = await this.fetchAllNodeOperatorSummaries(block);

    await Promise.all(
      Array.from(operatorsMap.keys()).map(async (operatorId: string) => {
        const name = await this.fetchOperatorName(operatorId, block);
        const rewardAddress =
          this.nodeOperatorNames.get(Number(operatorId))?.rewardAddress || "";
        this.nodeOperatorNames.set(Number(operatorId), {
          name,
          rewardAddress,
        });
      }),
    );

    return operatorsMap;
  }

  protected async fetchAllNodeOperatorSummaries(
    currentBlock: number,
  ): Promise<Map<string, NodeOperatorSummary>> {
    const operatorsMap = new Map<string, NodeOperatorSummary>();
    const [operatorsCountBN] =
      await this.contract.functions.getNodeOperatorsCount({
        blockTag: currentBlock,
      });
    const operatorsCount = operatorsCountBN.toNumber();

    for (let offset = 0; offset < operatorsCount; offset += this.batchSize) {
      const batchSize = Math.min(this.batchSize, operatorsCount - offset);
      const summaries = await Promise.all(
        Array.from({ length: batchSize }, (_, i) =>
          this.contract.functions.getNodeOperatorSummary(offset + i, {
            blockTag: currentBlock,
          }),
        ),
      );

      summaries.forEach((summary, index) => {
        operatorsMap.set(String(offset + index), summary);
      });
    }

    return operatorsMap;
  }
}
