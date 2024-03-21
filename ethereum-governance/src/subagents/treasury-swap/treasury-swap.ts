import { Finding, TransactionEvent, BlockEvent } from "forta-agent";

import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";
import { handleOrderCreation, handleOrderSettlement } from "./utils";

export const name = "Stonks";

const { TREASURY_SWAP_EVENTS_OF_NOTICE } = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  // TODO: find created init createdOrders
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings = await handleOrderSettlement(blockEvent);

  return findings;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleOrderCreation(txEvent),
    handleEventsOfNotice(txEvent, findings, TREASURY_SWAP_EVENTS_OF_NOTICE),
  ]);

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
