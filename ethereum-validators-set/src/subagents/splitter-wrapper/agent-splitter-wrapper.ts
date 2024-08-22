import { ethers, Finding, TransactionEvent } from "forta-agent";
import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";
import OBOL_LIDO_SPLIT_FACTORY_ABI from "../../abi/obol-splits/ObolLidoSplitFactory.json";
import SPLIT_MAIN_ABI from "../../abi/0xSplits/SplitMain.json";
import { ethersProvider } from "../../ethers";
import BigNumber from "bignumber.js";
import { getFindingOfBadSplitWalletParams, SplitWalletParams } from "./utils";

export const name = "SplitterWrapper";

const {
  OBOL_LIDO_SPLIT_FACTORY_CLUSTERS,
  SPLIT_MAIN_0XSPLIT_ADDRESS,
  ARAGON_AGENT_ADDRESS,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

const clusterSplitWalletFactories: ObolLidoSplitFactoryCluster[] = [];

const createSplitWalletIface = new ethers.utils.Interface([
  "function createSplit(address[] accounts,uint32[] percentAllocations,uint32 distributorFee,address controller)",
]);

const splitWalletContract = new ethers.Contract(
  SPLIT_MAIN_0XSPLIT_ADDRESS,
  SPLIT_MAIN_ABI,
  ethersProvider,
);

class ObolLidoSplitFactoryCluster {
  public readonly contract: ethers.Contract;

  constructor(
    public readonly clusterName: string,
    public readonly contractAddress: string,
  ) {
    this.contract = new ethers.Contract(
      contractAddress,
      OBOL_LIDO_SPLIT_FACTORY_ABI,
      ethersProvider,
    );
  }

  public async handleTransaction(
    txEvent: TransactionEvent,
  ): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (!(this.contractAddress in txEvent.addresses)) {
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

      const malformedSplitWalletParams = await handleCreateObolLidoSplitEvent(
        splitWalletAddress,
        splitWalletContract,
        createSplitWalletIface,
      );
      if (malformedSplitWalletParams) {
        findings.push(
          getFindingOfBadSplitWalletParams(
            splitWalletAddress,
            malformedSplitWalletParams,
            this.clusterName,
          ),
        );
      }
    }

    return findings;
  }
}

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  for (const {
    clusterName,
    factoryAddress,
  } of OBOL_LIDO_SPLIT_FACTORY_CLUSTERS) {
    clusterSplitWalletFactories.push(
      new ObolLidoSplitFactoryCluster(clusterName, factoryAddress),
    );
  }

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[][] = [];

  for (const splitWalletFactory of clusterSplitWalletFactories) {
    findings.push(await splitWalletFactory.handleTransaction(txEvent));
  }

  return findings.flat();
}

export async function handleCreateObolLidoSplitEvent(
  splitWalletAddress: string,
  splitWalletContract: ethers.Contract,
  createSplitWalletIface: ethers.utils.Interface,
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

  const hasException = accounts.includes(ARAGON_AGENT_ADDRESS);

  if (hasException) {
    const nonAgentAllocations = accounts
      .map((account, index) =>
        account === ARAGON_AGENT_ADDRESS ? 0 : percentAllocations[index],
      )
      .reduce((acc, percent) => acc + percent, 0);

    if (
      nonAgentAllocations !==
      1e6 - percentAllocations[accounts.indexOf(ARAGON_AGENT_ADDRESS)]
    ) {
      return splitWalletParams;
    }
  } else if (totalPercent % accounts.length === 0) {
    const is100percent = percentAllocations.every(
      (percent) => percentAllocations[0] === percent,
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
      // 142858, 142857, 142857, 142857, 142857, 142857, 142857
      if (expectedAlloc + 1 === percent) {
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
