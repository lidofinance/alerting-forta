import { BlockEvent, Finding } from "forta-agent";
import { Blockchain, NON_ETH_FETCH_INTERVAL, SAFES } from "./constants";
import { optimismProvider as provider } from "./providers";
import { handleSafeEvents } from "./handlers";

export const name = "Optimism-multisig-watcher";

const blockchain = Blockchain.OPTIMISM;
const safes = SAFES[blockchain];
let lastProcessedBlock = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}] initialized on block ${currentBlock}`);
  lastProcessedBlock = await provider.getBlockNumber();
  return { lastProcessedBlock: lastProcessedBlock.toString() };
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (blockEvent.blockNumber % NON_ETH_FETCH_INTERVAL == 0) {
    const currentBlock = await provider.getBlockNumber();
    console.log(`OPTIMISM block: ${currentBlock}`);
    const prevProcessedBlock = lastProcessedBlock;
    lastProcessedBlock = currentBlock;
    await handleSafeEvents(
      findings,
      provider,
      blockchain,
      safes,
      prevProcessedBlock,
      currentBlock
    );
  }

  return findings;
}
