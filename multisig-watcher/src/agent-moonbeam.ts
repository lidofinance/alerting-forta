import { BlockEvent, Finding } from "forta-agent";
import { NON_ETH_FETCH_INTERVAL, SAFES_MOONBEAM as safes } from "./constants";
import { moonbeamProvider as provider } from "./providers";
import { handleSafeEvents } from "./handlers";

export const name = "Moonbeam-multisig-watcher";

let lastProcessedBlock = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  lastProcessedBlock = await provider.getBlockNumber();
  return { lastProcessedBlock: lastProcessedBlock.toString() };
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (blockEvent.blockNumber % NON_ETH_FETCH_INTERVAL == 0) {
    const currentBlock = await provider.getBlockNumber();
    await handleSafeEvents(
      findings,
      provider,
      safes,
      lastProcessedBlock,
      currentBlock
    );
    lastProcessedBlock = currentBlock;
  }

  return findings;
}
