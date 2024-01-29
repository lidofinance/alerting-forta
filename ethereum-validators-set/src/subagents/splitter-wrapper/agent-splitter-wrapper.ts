import {
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";
import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";
import OBOL_LIDO_SPLIT_FACTORY_ABI from "../../abi/obol-splits/ObolLidoSplitFactory.json";
import SPLIT_MAIN_ABI from "../../abi/0xSplits/SplitMain.json";
import STAKING_ROUTER_ABI from "../../abi/StakingRouter.json";
import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";
import { ethersProvider } from "../../ethers";
import BigNumber from "bignumber.js";
import {
  getFindingOfBadSplitWalletParams,
  NodeOperatorFullInfo,
  SplitWalletParams,
} from "./utils";

export const name = "SplitterWrapper";

const {
  OBOL_LIDO_SPLIT_FACTORY_ADDRESS,
  SPLIT_MAIN_0XSPLIT_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  STAKING_MODULES,
  NODE_OPERATOR_REWARD_ADDRESS_SET_EVENT,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

interface EventsOfNotice {
  address: string;
  event: string;
  alertId: string;
  description: (args: any, names: Map<number, string>) => string;
  severity: FindingSeverity;
}

interface NodeOperatorModuleParams {
  moduleId: number;
  moduleAddress: string;
  alertPrefix: string;
  moduleName: string;
  eventsOfNotice: EventsOfNotice[];
}

class NodeOperatorsRegistryModuleContext {
  public nodeOperatorMap = new Map<string, NodeOperatorFullInfo>();

  constructor(
    public readonly params: NodeOperatorModuleParams,
    private readonly stakingRouter: ethers.Contract,
  ) {}

  async initialize(currentBlock: number) {
    const nodeOperatorRegistry = new ethers.Contract(
      this.params.moduleAddress,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider,
    );

    const [operators] =
      await this.stakingRouter.functions.getAllNodeOperatorDigests(
        this.params.moduleId,
        { blockTag: currentBlock },
      );

    for (const digest of operators) {
      const { name, rewardAddress } =
        await nodeOperatorRegistry.functions.getNodeOperator(digest.id, {
          blockTag: currentBlock,
        });

      this.nodeOperatorMap.set(String(digest.id), { name, rewardAddress });
    }
  }
}

const stakingModulesOperatorRegistry: NodeOperatorsRegistryModuleContext[] = [];
const createSplitForSplitWalletIface = new ethers.utils.Interface([
  "function createSplit(address splitWallet)",
]);
const createSplitWalletIface = new ethers.utils.Interface([
  "function createSplit(address[] accounts,uint32[] percentAllocations,uint32 distributorFee,address controller)",
]);
const obolLidoSplitFactoryContract = new ethers.Contract(
  OBOL_LIDO_SPLIT_FACTORY_ADDRESS,
  OBOL_LIDO_SPLIT_FACTORY_ABI,
  ethersProvider,
);
const splitWalletContract = new ethers.Contract(
  SPLIT_MAIN_0XSPLIT_ADDRESS,
  SPLIT_MAIN_ABI,
  ethersProvider,
);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const stakingRouter = new ethers.Contract(
    STAKING_ROUTER_ADDRESS,
    STAKING_ROUTER_ABI,
    ethersProvider,
  );

  stakingModulesOperatorRegistry.length = 0;
  for (const {
    moduleId,
    moduleAddress,
    moduleName,
    alertPrefix,
  } of STAKING_MODULES) {
    if (!moduleId) {
      console.log(`${moduleName} is not supported on this network for ${name}`);
      continue;
    }

    stakingModulesOperatorRegistry.push(
      new NodeOperatorsRegistryModuleContext(
        {
          moduleId,
          moduleAddress,
          moduleName,
          alertPrefix,
          eventsOfNotice: [],
        },
        stakingRouter,
      ),
    );
  }

  await Promise.all(
    stakingModulesOperatorRegistry.map((nodeOperatorRegistry) =>
      nodeOperatorRegistry.initialize(currentBlock),
    ),
  );

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[][] = [];

  for (const stakingModule of stakingModulesOperatorRegistry) {
    if (!(stakingModule.params.moduleAddress in txEvent.addresses)) {
      continue;
    }

    const stakingModuleFindings = await handleStakingModule(
      stakingModule,
      txEvent,
    );
    findings.push(stakingModuleFindings);
  }

  findings.push(await handleCreateObolLidoSplitContract(txEvent));

  return findings.flat();
}

async function handleStakingModule(
  stakingModule: NodeOperatorsRegistryModuleContext,
  txEvent: TransactionEvent,
): Promise<Finding[]> {
  const setRewardAddressEvents = txEvent.filterLog(
    NODE_OPERATOR_REWARD_ADDRESS_SET_EVENT,
    stakingModule.params.moduleAddress,
  );

  if (!setRewardAddressEvents.length) {
    return [];
  }

  const findings: Finding[][] = [];

  for (const nodeOperatorFullInfo of stakingModule.nodeOperatorMap.values()) {
    findings.push(await handleRewardAddressObolLidoSplit(nodeOperatorFullInfo));
  }

  return findings.flat();
}

async function handleCreateObolLidoSplitContract(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (!(OBOL_LIDO_SPLIT_FACTORY_ADDRESS in txEvent.addresses)) {
    return [];
  }

  const transDescriptions = txEvent.filterFunction(
    "function createSplit(address splitWallet)",
  );
  for (const transDescription of transDescriptions) {
    const [splitWalletAddress] = transDescription.args;
    if (!splitWalletAddress) {
      continue;
    }

    const malformedSplitWalletParams =
      await handleCreateObolLidoSplitEvent(splitWalletAddress);
    if (malformedSplitWalletParams) {
      findings.push(
        getFindingOfBadSplitWalletParams(
          splitWalletAddress,
          malformedSplitWalletParams,
        ),
      );
    }
  }

  return findings;
}

async function handleRewardAddressObolLidoSplit(
  nodeOperator: NodeOperatorFullInfo,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { rewardAddress } = nodeOperator;

  const filterCreateObolLidoSplit =
    obolLidoSplitFactoryContract.filters.CreateObolLidoSplit();
  const createObolLidoSplitEvents =
    await obolLidoSplitFactoryContract.queryFilter(filterCreateObolLidoSplit);

  const createRewardAddressEvent = createObolLidoSplitEvents.find(
    (event) => event.args?.[0] === rewardAddress,
  );
  if (!createRewardAddressEvent) {
    return [
      Finding.from({
        alertId: "MALFORMED-REWARD-ADDRESS",
        name: "⚠️ SplitterWrapper: Malformed Reward address provided",
        description: `RewardAddress (${rewardAddress}) of "${name}" NodeOperator created not via ObolSplitFactory`,
        severity: FindingSeverity.High,
        type: FindingType.Info,
      }),
    ];
  }

  const trans = await createRewardAddressEvent.getTransaction();
  const [splitWalletAddress] =
    createSplitForSplitWalletIface.decodeFunctionData(
      "createSplit",
      trans.data,
    );

  const malformedSplitWalletParams =
    await handleCreateObolLidoSplitEvent(splitWalletAddress);
  if (malformedSplitWalletParams) {
    findings.push(
      getFindingOfBadSplitWalletParams(
        splitWalletAddress,
        malformedSplitWalletParams,
        nodeOperator,
      ),
    );
  }

  return findings;
}

async function handleCreateObolLidoSplitEvent(
  splitWalletAddress: string,
): Promise<SplitWalletParams | null> {
  const filterCreateSplit =
    splitWalletContract.filters.CreateSplit(splitWalletAddress);
  const [createdSplit] =
    await splitWalletContract.queryFilter(filterCreateSplit);

  const splitWalletCreatedTrans = await createdSplit.getTransaction();
  const createSplitWalletData = createSplitWalletIface.decodeFunctionData(
    "createSplit",
    splitWalletCreatedTrans.data,
  ) as [string[], number[], number, string];

  const [accounts, percentAllocations, distributorFee, controller] =
    createSplitWalletData;

  const splitWalletParams: SplitWalletParams = {
    accounts,
    percentAllocations,
    distributorFee,
    controller,
  };

  const totalPercent = percentAllocations.reduce(
    (acc, percent) => acc + percent,
    0,
  );
  if (totalPercent !== 1e6) {
    return splitWalletParams;
  }

  if (totalPercent % accounts.length === 0) {
    const is100percent = percentAllocations.some(
      (percent) => percentAllocations[0] !== percent,
    );
    if (!is100percent) {
      return splitWalletParams;
    }
  } else {
    const expectedAlloc = Math.floor(totalPercent / accounts.length);
    const isEventlyDistributed = percentAllocations.every((percent) => {
      if (expectedAlloc === percent) {
        return true;
      }
      if (expectedAlloc - 1 === percent) {
        return true;
      }

      return false;
    });
    if (!isEventlyDistributed) {
      return splitWalletParams;
    }
  }

  if (distributorFee !== 0) {
    return splitWalletParams;
  }

  if (!BigNumber(controller).isZero()) {
    return splitWalletParams;
  }

  return null;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  initialize, // sdk won't provide any arguments to the function
  handleTransaction,
};
