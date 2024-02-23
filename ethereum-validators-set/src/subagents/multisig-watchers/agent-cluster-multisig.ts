import { Finding, TransactionEvent, ethers } from "forta-agent";
import { ethersProvider } from "../../ethers";
import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";
import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";
import ARAGON_ACL_ABI from "../../abi/aragon/ACL.json";
import STAKING_ROUTER_ABI from "../../abi/StakingRouter.json";
import BigNumber from "bignumber.js";
import { EventsOfNotice, getEventsOfNoticeForSafe } from "./utils";
import { GnosisSafeFortaHandler } from "./gnosis-safe-handler";

const {
  ARAGON_ACL_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  STAKING_MODULES,
  BLOCKCHAIN_INFO,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge,
);

export const name = "ClusterMultisig";

interface StakingModuleManagersParams {
  moduleId: number;
  moduleAddress: string;
  alertPrefix: string;
  moduleName: string;
  eventsOfNotice: EventsOfNotice[];
}

class StakingModuleManagersMultisig {
  public clusterManagerMap = new Map<number, GnosisSafeFortaHandler>();
  private readonly stakingModuleContract: ethers.Contract;

  constructor(
    public readonly params: StakingModuleManagersParams,
    private readonly aclContract: ethers.Contract,
    private readonly stakingRouterContract: ethers.Contract,
  ) {
    this.stakingModuleContract = new ethers.Contract(
      params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );
  }

  public async initialize(currentBlock: number) {
    await this.fillClusterManagerAddresses(currentBlock);
    await this.updateClusterNames(currentBlock);
  }

  private async updateClusterNames(block: number) {
    const [operators] =
      await this.stakingRouterContract.functions.getAllNodeOperatorDigests(
        this.params.moduleId,
        { blockTag: block },
      );

    await Promise.all(
      operators.map(async (operator: any) => {
        const { name } = await this.stakingModuleContract.getNodeOperator(
          String(operator.id),
          true,
          { blockTag: block },
        );
        const clusterManagerHandler = this.clusterManagerMap.get(
          Number(operator.id),
        );
        if (!clusterManagerHandler) {
          return;
        }
        clusterManagerHandler.safeName = name;
      }),
    );
  }

  private async fillClusterManagerAddresses(currentBlock: number) {
    const role = await this.stakingModuleContract.MANAGE_SIGNING_KEYS();
    const fromBlock = Math.max(currentBlock - 1000000000, 0);

    const filter = this.aclContract.filters.SetPermission(
      null,
      this.params.moduleAddress,
      role,
    );
    const eventLogs = await this.aclContract.queryFilter(
      filter,
      fromBlock,
      currentBlock,
    );

    for await (const eventLog of eventLogs) {
      if (!eventLog) {
        continue;
      }

      const managerAddress = eventLog.args?.[0] as string;
      try {
        const roleParams = await this.aclContract.getPermissionParam(
          managerAddress,
          this.params.moduleAddress,
          role,
          0,
        );
        const operatorId = roleParams[2] as BigNumber;
        if (this.clusterManagerMap.has(operatorId.toNumber())) {
          console.warn("manager address already exists", {
            operatorId,
            managerAddress,
          });
        }
        this.clusterManagerMap.set(
          operatorId.toNumber(),
          new GnosisSafeFortaHandler(managerAddress, operatorId.toString()),
        );
      } catch (error) {
        // ignore if role has no params
      }
    }
  }
}

const stakingModuleManagersMultisigList: StakingModuleManagersMultisig[] = [];

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const aclContract = new ethers.Contract(
    ARAGON_ACL_ADDRESS,
    ARAGON_ACL_ABI,
    ethersProvider,
  );

  const stakingRouter = new ethers.Contract(
    STAKING_ROUTER_ADDRESS,
    STAKING_ROUTER_ABI,
    ethersProvider,
  );

  const moduleIds: { stakingModuleIds: BigNumber[] } =
    await stakingRouter.functions.getStakingModuleIds({
      blockTag: currentBlock,
    });

  stakingModuleManagersMultisigList.length = 0;
  for (const {
    moduleId,
    moduleAddress,
    moduleName,
    alertPrefix,
  } of STAKING_MODULES) {
    if (!moduleId) {
      console.warn(
        `Multisig monitoring is not supported for ${moduleName} module`,
      );
      continue;
    }

    const moduleExists = moduleIds.stakingModuleIds.some(
      (stakingModuleId) => stakingModuleId.toString() === moduleId.toString(),
    );
    if (!moduleExists) {
      continue;
    }

    const eventsOfNotice = getEventsOfNoticeForSafe(
      alertPrefix,
      `${moduleName} Cluster`,
      {
        safeUrlPrefix: BLOCKCHAIN_INFO.safeUrlPrefix,
        txUrlPrefix: BLOCKCHAIN_INFO.txUrlPrefix,
        safeTxUrlPrefix: BLOCKCHAIN_INFO.safeTxUrlPrefix,
      },
    );

    const stakingModule = new StakingModuleManagersMultisig(
      {
        moduleId,
        moduleAddress,
        moduleName,
        alertPrefix,
        eventsOfNotice,
      },
      aclContract,
      stakingRouter,
    );
    stakingModuleManagersMultisigList.push(stakingModule);
    await stakingModule.initialize(currentBlock);
  }

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  let resultFindings: Finding[] = [];

  for (const stakingModule of stakingModuleManagersMultisigList) {
    const stakingModuleFindings = await handleStakingModule(
      txEvent,
      stakingModule,
    );
    resultFindings = [...resultFindings, ...stakingModuleFindings];
  }

  return resultFindings;
}

async function handleStakingModule(
  txEvent: TransactionEvent,
  stakingModule: StakingModuleManagersMultisig,
): Promise<Finding[]> {
  let findings: Finding[] = [];

  const { clusterManagerMap, params } = stakingModule;
  for await (const [, clusterManagerHandler] of clusterManagerMap.entries()) {
    if (!(clusterManagerHandler.safeAddress in txEvent.addresses)) {
      continue;
    }

    for (const eventInfo of params.eventsOfNotice) {
      const newFindings = await clusterManagerHandler.handleTransaction(
        txEvent,
        eventInfo,
      );
      findings = [...findings, ...newFindings];
    }
  }

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
