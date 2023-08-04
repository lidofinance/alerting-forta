// VS bot
import { Finding, TransactionEvent } from "forta-agent";

import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";

export const name = "StakingRouter";

const { STAKING_ROUTER_EVENTS_OF_NOTICE } = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleEventsOfNotice(txEvent, findings, STAKING_ROUTER_EVENTS_OF_NOTICE);

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
