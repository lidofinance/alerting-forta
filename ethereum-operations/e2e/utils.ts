import * as fs from "fs";
import { join } from "path";
import { jsonc } from "jsonc";
import { Provider } from "@ethersproject/abstract-provider";

import { RunHandlersOnBlock } from "forta-agent/dist/cli/utils/run.handlers.on.block";
import { RunHandlersOnTransaction } from "forta-agent/dist/cli/utils/run.handlers.on.transaction";

/**
 * Helper function to use the given module as agent path.
 * @see https://github.dev/forta-network/forta-bot-sdk/blob/d73d5070897c9cbad8c1d356589d53222a9e692d/cli/di.container.ts#L156-L171
 */
export function provideAgentPath(
  moduleName: string
): (contextPath: string) => string {
  return (contextPath: string) => {
    const tsConfigPath = join(contextPath, "tsconfig.json");
    const { compilerOptions } = jsonc.parse(
      fs.readFileSync(tsConfigPath, "utf8")
    );

    return join(contextPath, compilerOptions.outDir, moduleName);
  };
}

/**
 * Replacement for runHandlersOnTransaction for e2e tests container. Duplicates
 * logic from agent.ts to be able to initialize sub-agents in the same manner
 * as the main one.
 */
export function provideRunTransaction(
  runHandlersOnTransaction: RunHandlersOnTransaction,
  ethersProvider: Provider,
  dynamicImport: any,
  agentPath: string
) {
  return async function (txHash: string) {
    const agent = await dynamicImport(agentPath);
    if (typeof agent.initialize === "function") {
      const tx = await ethersProvider.getTransaction(txHash);
      if (!tx?.blockNumber) {
        throw new Error(
          `Error retrieving block number of transaction ${txHash}`
        );
      }
      await agent.initialize(tx.blockNumber);
    }

    return await runHandlersOnTransaction(txHash);
  };
}

/**
 * Replacement for runHandlersOnBlock for e2e tests container. Duplicates logic
 * from agent.ts to be able to initialize sub-agents in the same manner as the
 * main one.
 */
export function provideRunBlock(
  runHandlersOnBlock: RunHandlersOnBlock,
  dynamicImport: any,
  agentPath: string
) {
  return async function (blockHashOrNumber: string | number, initBlock?: number) {
    const agent = await dynamicImport(agentPath);
    if (typeof agent.initialize === "function") {
      await agent.initialize(initBlock? initBlock : blockHashOrNumber);
    }

    return await runHandlersOnBlock(blockHashOrNumber);
  };
}

/**
 * Logging function for local runs that works over the process stderr
 * directly instead of `console.log` calls.
 */
export function log(obj: any): void {
  if ("GITHUB_ACTION" in process.env) {
    return;
  }

  process.stderr.write(JSON.stringify(obj, null, 4));
}
