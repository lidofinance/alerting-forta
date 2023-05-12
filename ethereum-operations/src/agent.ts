import {
  BlockEvent,
  TransactionEvent,
  HandleBlock,
  HandleTransaction,
  Finding,
  FindingType,
  FindingSeverity,
  ethers,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import { argv } from "process";

import LIDO_APP_REPO_ABI from "./abi_v1/LidoAppRepo.json";

import * as agentLidoOracle_v1 from "./subagents_v1/lido-oracle/agent-lido-oracle";
import * as agentEasyTrack_v1 from "./subagents_v1/easy-track/agent-easy-track";
import * as agentDaoOps_v1 from "./subagents_v1/dao-ops/agent-dao-ops";
import * as agentProxy_v1 from "./subagents_v1/proxy-watcher/agent-proxy-watcher";
import * as agentAragon_v1 from "./subagents_v1/aragon-voting/agent-aragon-voting";
import * as agentACL_v1 from "./subagents_v1/acl-changes/agent-acl-changes";
import * as agentNORegistry_v1 from "./subagents_v1/node-operators-registry/agent-node-operators-registry";

import * as agentAccountingOracle from "./subagents/accounting-oracle/agent-accounting-oracle";
import * as agentAccountingOracleHashConsensus from "./subagents/accounting-oracle/agent-accounting-hash-consensus";
import * as agentExitBusOracle from "./subagents/exitbus-oracle/agent-exitbus-oracle";
import * as agentExitBusOracleHashConsensus from "./subagents/exitbus-oracle/agent-exitbus-hash-consensus";
import * as agentLidoOracle from "./subagents/lido-report/agent-lido-report";
import * as agentEasyTrack from "./subagents/easy-track/agent-easy-track";
import * as agentDaoOps from "./subagents/dao-ops/agent-dao-ops";
import * as agentProxy from "./subagents/proxy-watcher/agent-proxy-watcher";
import * as agentAragon from "./subagents/aragon-voting/agent-aragon-voting";
import * as agentACL from "./subagents/acl-changes/agent-acl-changes";
import * as agentNORegistry from "./subagents/node-operators-registry/agent-node-operators-registry";
import * as agentWithdrawals from "./subagents/withdrawals/agent-withdrawals";
import * as agentSanityChecker from "./subagents/sanity-checker/agent-sanity-checker";
import * as agentOracleDaemonConfig from "./subagents/oracle-daemon-config/agent-oracle-daemon-config";
import * as agentStakingRouter from "./subagents/staking-router/agent-staking-router";
import * as agentGateSeal from "./subagents/gate-seal/agent-gate-seal";
import * as agentVaults from "./subagents/vaults/agent-vaults";

import VERSION from "./version";
import { mergeFindings, RedefineMode, requireWithTier } from "./common/utils";
import type * as Constants from "./common/constants";

const {
  LIDO_ADDRESS,
  LIDO_APP_REPO_ADDRESS,
  LIDO_APP_SEMANTIC_MAJOR_VERSION_V1,
  LIDO_CONTRACT_VERSION_SET_EVENT,
  RUN_TIER,
} = requireWithTier<typeof Constants>(
  module,
  `./common/constants`,
  RedefineMode.Merge
);

type Metadata = { [key: string]: string };
interface SubAgent {
  __tier__?: string;
  name: string;
  handleBlock?: HandleBlock;
  handleTransaction?: HandleTransaction;
  initialize?: (blockNumber: number) => Promise<Metadata>;
}

const subAgents_v1: SubAgent[] = [
  agentLidoOracle_v1,
  agentEasyTrack_v1,
  agentDaoOps_v1,
  agentProxy_v1,
  agentAragon_v1,
  agentACL_v1,
  agentNORegistry_v1,
];

const subAgents: SubAgent[] = [
  agentAccountingOracle,
  agentAccountingOracleHashConsensus,
  agentExitBusOracle,
  agentExitBusOracleHashConsensus,
  agentLidoOracle,
  agentEasyTrack,
  agentDaoOps,
  agentProxy,
  agentAragon,
  agentACL,
  agentNORegistry,
  agentSanityChecker,
  agentOracleDaemonConfig,
  agentStakingRouter,
  agentWithdrawals,
  agentGateSeal,
  agentVaults,
].filter((agent: SubAgent) => {
  if (!RUN_TIER) return true;
  if (agent.__tier__ == RUN_TIER) return true;
  console.warn(
    `Skipping sub-agent [${agent.name}]: unsupported run tier '${RUN_TIER}'`
  );
});

// block or tx handling should take no more than 120 sec.
// If not all processing is done it interrupts the execution, sends current findings and errors as findings too
const processingTimeout = 120_000;

const maxHandlerRetries = 5;

let findingsOnInit: Finding[] = [];

let protocolVersionSwitchBlock: number = 0;
let isNewVersionInitialized: boolean = false;

const initialize = async () => {
  let blockNumber: number = -1;

  if (argv.includes("--block")) {
    blockNumber = parseInt(argv[4]);
  } else if (argv.includes("--range")) {
    blockNumber = parseInt(argv[4].slice(0, argv[4].indexOf(".")));
  } else if (argv.includes("--tx")) {
    const txHash = argv[4];
    const tx = await ethersProvider.getTransaction(txHash);
    if (!tx) {
      throw new Error(`Can't find transaction ${txHash}`);
    }
    if (!tx.blockNumber) {
      throw new Error(`Transaction ${txHash} was not yet included into block`);
    }
    blockNumber = tx.blockNumber;
  }

  if (blockNumber == -1) {
    blockNumber = await ethersProvider.getBlockNumber();
  }

  const lidoAppRepo = new ethers.Contract(
    LIDO_APP_REPO_ADDRESS,
    LIDO_APP_REPO_ABI,
    ethersProvider
  );
  const { semanticVersion } = await lidoAppRepo.functions.getLatest({
    blockTag: blockNumber,
  });
  if (semanticVersion[0] > LIDO_APP_SEMANTIC_MAJOR_VERSION_V1) {
    await _initialize(subAgents, blockNumber);
    isNewVersionInitialized = true;
  } else {
    await _initialize(subAgents_v1, blockNumber);
  }
};

const _initialize = async (subAgents: SubAgent[], blockNumber: number) => {
  const metadata: Metadata = {
    "version.commitHash": VERSION.commitHash,
    "version.commitMsg": VERSION.commitMsg,
  };

  await Promise.all(
    subAgents.map(async (agent, _) => {
      if (agent.initialize) {
        try {
          const agentMeta = await agent.initialize(blockNumber);
          for (const metaKey in agentMeta) {
            metadata[`${agent.name}.${metaKey}`] = agentMeta[metaKey];
          }
        } catch (err: any) {
          console.log(`Exiting due to init failure on ${agent.name}`);
          console.log(`Error: ${err}`);
          console.log(`Stack: ${err.stack}`);
          process.exit(1);
        }
      }
    })
  );

  metadata.agents = "[" + subAgents.map((a) => `"${a.name}"`).join(", ") + "]";

  findingsOnInit.push(
    Finding.fromObject({
      name: "Agent launched",
      description: `Version: ${VERSION.desc}`,
      alertId: "LIDO-AGENT-LAUNCHED",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      metadata,
    })
  );
  console.log("Bot initialization is done!");
};

const timeout = async (agent: SubAgent) =>
  new Promise<never>((_, reject) => {
    setTimeout(() => {
      const err = new Error(`Sub-agent ${agent.name} timed out`);
      reject(err);
    }, processingTimeout);
  });

const handleBlock: HandleBlock = async (
  blockEvent: BlockEvent
): Promise<Finding[]> => {
  if (
    !isNewVersionInitialized &&
    protocolVersionSwitchBlock != 0 &&
    blockEvent.blockNumber > protocolVersionSwitchBlock
  ) {
    await _initialize(subAgents, blockEvent.blockNumber);
    isNewVersionInitialized = true;
  }

  if (isNewVersionInitialized) {
    return await _handleBlock(subAgents, blockEvent);
  } else {
    return await _handleBlock(subAgents_v1, blockEvent);
  }
};

const _handleBlock = async (
  subAgents: SubAgent[],
  blockEvent: BlockEvent
): Promise<Finding[]> => {
  let blockFindings: Finding[] = [];
  // report findings from init. Will be done only for the first block report.
  if (findingsOnInit.length) {
    blockFindings = blockFindings.concat(findingsOnInit);
    findingsOnInit = [];
  }

  const run = async (agent: SubAgent, blockEvent: BlockEvent) => {
    if (!agent.handleBlock) return;
    let retries = maxHandlerRetries;
    let success = false;
    let lastError;
    while (retries-- > 0 && !success) {
      try {
        const newFindings = await agent.handleBlock(blockEvent);
        if (newFindings.length) {
          enrichFindingsMetadata(newFindings);
          blockFindings = blockFindings.concat(newFindings);
        }
        success = true;
      } catch (err) {
        lastError = err;
      }
    }
    if (!success) {
      blockFindings.push(errorToFinding(lastError, agent, "handleBlock"));
    }
  };

  // run agents handlers
  // wait all results whether success or failure (include timeout errors)

  const runs = await Promise.allSettled(
    subAgents.map(async (agent) => {
      return await Promise.race([run(agent, blockEvent), timeout(agent)]);
    })
  );

  runs.forEach((r: PromiseSettledResult<any>, index: number) => {
    if (r.status == "rejected") {
      blockFindings.push(
        errorToFinding(r.reason, subAgents[index], "handleBlock")
      );
    }
  });

  if (blockFindings.length > 50) {
    blockFindings = mergeFindings(blockFindings);
  }
  return blockFindings;
};

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
): Promise<Finding[]> => {
  if (!isNewVersionInitialized) {
    const [event] = txEvent.filterLog(
      LIDO_CONTRACT_VERSION_SET_EVENT,
      LIDO_ADDRESS
    );
    if (event) {
      protocolVersionSwitchBlock = txEvent.blockNumber;
    }
  }

  if (isNewVersionInitialized) {
    return await _handleTransaction(subAgents, txEvent);
  } else {
    return await _handleTransaction(subAgents_v1, txEvent);
  }
};

const _handleTransaction = async (
  subAgents: SubAgent[],
  txEvent: TransactionEvent
) => {
  let txFindings: Finding[] = [];
  const run = async (agent: SubAgent, txEvent: TransactionEvent) => {
    if (!agent.handleTransaction) return;
    let retries = maxHandlerRetries;
    let success = false;
    let lastError;
    while (retries-- > 0 && !success) {
      try {
        const newFindings = await agent.handleTransaction(txEvent);
        if (newFindings.length) {
          enrichFindingsMetadata(newFindings);
          txFindings = txFindings.concat(newFindings);
        }
        success = true;
      } catch (err) {
        lastError = err;
      }
    }
    if (!success) {
      txFindings.push(errorToFinding(lastError, agent, "handleTransaction"));
    }
  };

  // run agents handlers
  // wait all results whether success or failure (include timeout errors)
  const runs = await Promise.allSettled(
    subAgents.map(async (agent) => {
      return await Promise.race([run(agent, txEvent), timeout(agent)]);
    })
  );

  runs.forEach((r: PromiseSettledResult<any>, index: number) => {
    if (r.status == "rejected") {
      txFindings.push(
        errorToFinding(r.reason, subAgents[index], "handleBlock")
      );
    }
  });

  if (txFindings.length > 50) {
    txFindings = mergeFindings(txFindings);
  }
  return txFindings;
};

function enrichFindingsMetadata(findings: Finding[]) {
  return findings.forEach(enrichFindingMetadata);
}

function enrichFindingMetadata(finding: Finding) {
  finding.metadata["version.commitHash"] = VERSION.commitHash;
}

function errorToFinding(e: unknown, agent: SubAgent, fnName: string): Finding {
  const err: Error =
    e instanceof Error ? e : new Error(`non-Error thrown: ${e}`);
  const finding = Finding.fromObject({
    name: `Error in ${agent.name}.${fnName}`,
    description: `${err}`,
    alertId: "LIDO-AGENT-ERROR",
    severity: FindingSeverity.High,
    type: FindingType.Degraded,
    metadata: { stack: `${err.stack}` },
  });
  enrichFindingMetadata(finding);
  return finding;
}

export default {
  initialize,
  handleBlock,
  handleTransaction,
};
