import {
  BlockEvent,
  TransactionEvent,
  HandleBlock,
  HandleTransaction,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import { argv } from "process";

import * as agentAccountingOracle from "./subagents/accounting-oracle/agent-accounting-oracle";
import * as agentAccountingOracleHashConsensus from "./subagents/accounting-oracle/agent-accounting-hash-consensus";
import * as agentExitBusOracle from "./subagents/exitbus-oracle/agent-exitbus-oracle";
import * as agentExitBusOracleHashConsensus from "./subagents/exitbus-oracle/agent-exitbus-hash-consensus";
import * as agentLidoOracle from "./subagents/lido-oracle/agent-lido-oracle";
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

import VERSION from "./version";
import { RUN_TIER } from "./common/constants";

type Metadata = { [key: string]: string };
interface SubAgent {
  __tier__?: string;
  name: string;
  handleBlock?: HandleBlock;
  handleTransaction?: HandleTransaction;
  initialize?: (blockNumber: number) => Promise<Metadata>;
}

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

const initialize = async () => {
  const metadata: Metadata = {
    "version.commitHash": VERSION.commitHash,
    "version.commitMsg": VERSION.commitMsg,
  };

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

  return blockFindings;
};

const handleTransaction: HandleTransaction = async (
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
