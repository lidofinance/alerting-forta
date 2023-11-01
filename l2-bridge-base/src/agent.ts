import { argv } from "process";
import { Block, Log } from "@ethersproject/abstract-provider";

import {
  BlockEvent,
  HandleBlock,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { baseProvider } from "./providers";

import * as agentGov from "./agent-governance";
import * as agentProxy from "./agent-proxy-watcher";
import * as agentBridge from "./agent-bridge-watcher";
import * as agentWithdrawals from "./agent-withdrawals";
import VERSION from "./version";

type Metadata = { [key: string]: string };
type CustomHandleBlock = (blockEvent: BlockDto) => Promise<Finding[]>;
type CustomHandleTransaction = (
  logs: Log[],
  blockEvents: BlockDto[],
) => Promise<Finding[]>;

interface SubAgent {
  name: string;
  handleBlock?: CustomHandleBlock;
  handleTransaction?: CustomHandleTransaction;
  initialize?: (blockNumber: number) => Promise<Metadata>;
}

const subAgents: SubAgent[] = [
  agentBridge,
  agentGov,
  agentProxy,
  agentWithdrawals,
];

// block or tx handling should take no more than 120 sec.
// If not all processing is done it interrupts the execution, sends current findings and errors as findings too
const processingTimeout = 120_000;
const maxHandlerRetries = 5;

let findingsOnInit: Finding[] = [];
let cachedBlockDto: BlockDto;
let iteration: number = 0;

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
    const tx = await baseProvider.getTransaction(txHash);
    if (!tx) {
      throw new Error(`Can't find transaction ${txHash}`);
    }
    if (!tx.blockNumber) {
      throw new Error(`Transaction ${txHash} was not yet included into block`);
    }
    blockNumber = tx.blockNumber;
  }

  if (blockNumber == -1) {
    blockNumber = await baseProvider.getBlockNumber();
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
    }),
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
    }),
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
  blockEvent: BlockEvent,
): Promise<Finding[]> => {
  let blockFindings: Finding[] = [];
  // report findings from init. Will be done only for the first block report.
  if (findingsOnInit.length) {
    blockFindings = blockFindings.concat(findingsOnInit);
    findingsOnInit = [];
  }

  let workingBlocks: BlockDto[] = [];

  if (cachedBlockDto === undefined) {
    const block: Block = await baseProvider.getBlock("latest");

    cachedBlockDto = {
      number: block.number,
      timestamp: block.timestamp,
    };

    workingBlocks.push(cachedBlockDto);
    iteration += 1;
  } else {
    const latestBlock: Block = await baseProvider.getBlock("latest");
    const range = function (start: number, end: number): number[] {
      return Array.from(Array(end - start + 1).keys()).map((x) => x + start);
    };

    const blocksInterval = range(cachedBlockDto.number, latestBlock.number);
    const blocks = await Promise.all(
      blocksInterval.map(async (blockNumber: number) => {
        return await baseProvider.getBlock(blockNumber);
      }),
    );

    for (const block of blocks) {
      workingBlocks.push({
        number: block.number,
        timestamp: block.timestamp,
      });
    }

    cachedBlockDto = {
      number: latestBlock.number,
      timestamp: latestBlock.timestamp,
    };

    iteration += 1;
  }

  console.log(
    `#${iteration} ETH block ${blockEvent.blockNumber.toString()}. Fetching base blocks from ${
      workingBlocks[0].number
    } to ${workingBlocks[workingBlocks.length - 1].number}`,
  );
  const logs: Log[] = await baseProvider.send("eth_getLogs", [
    {
      fromBlock: `0x${workingBlocks[0].number.toString(16)}`,
      toBlock: `0x${workingBlocks[workingBlocks.length - 1].number.toString(
        16,
      )}`,
    },
  ]);

  const run = async (agent: SubAgent, blockDtos: BlockDto[]) => {
    if (!agent.handleBlock) return;

    let retries = maxHandlerRetries;
    let success = false;
    let lastError;

    for (const blockDto of blockDtos) {
      while (retries-- > 0 && !success) {
        try {
          const newFindings = await agent.handleBlock(blockDto);

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
    }
  };

  const runs = await Promise.allSettled(
    subAgents.map(async (agent) => {
      return await Promise.race([run(agent, workingBlocks), timeout(agent)]);
    }),
  );

  runs.forEach((r: PromiseSettledResult<any>, index: number) => {
    if (r.status == "rejected") {
      blockFindings.push(
        errorToFinding(r.reason, subAgents[index], "handleBlock"),
      );
    }
  });

  const findings = await handleLogs(logs, workingBlocks);
  return [...blockFindings, ...findings];
};

const handleLogs = async (logs: Log[], blocksDto: BlockDto[]) => {
  let txFindings: Finding[] = [];
  const run = async (agent: SubAgent, logs: Log[]) => {
    if (!agent.handleTransaction) return;
    let retries = maxHandlerRetries;
    let success = false;
    let lastError;
    while (retries-- > 0 && !success) {
      try {
        const newFindings = await agent.handleTransaction(logs, blocksDto);
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
      return await Promise.race([run(agent, logs), timeout(agent)]);
    }),
  );

  runs.forEach((r: PromiseSettledResult<any>, index: number) => {
    if (r.status == "rejected") {
      txFindings.push(
        errorToFinding(r.reason, subAgents[index], "handleBlock"),
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
};
