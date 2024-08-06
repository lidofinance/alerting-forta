import { BlockEvent, Finding, TransactionEvent } from "forta-agent";
import {
  handleBridgeBalance,
  handleL1BridgeTransactionEvents,
} from "./handlers";

export const name = "BridgeWatcher";

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}] started on ${currentBlock}`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  return handleBridgeBalance(blockEvent);
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleL1BridgeTransactionEvents(txEvent, findings);

  return findings;
}
