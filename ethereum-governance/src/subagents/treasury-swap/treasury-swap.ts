import { Finding, TransactionEvent } from "forta-agent";

import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";

export const name = "Stonks";
const createdOrders: any = [];

const {
  STONKS_ORDER_CREATION,
  TREASURY_SWAP_EVENTS_OF_NOTICE,
  createOrderWatchEvent,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const orderFindings: Finding[] = [];
  const findings: Finding[] = [];

  handleEventsOfNotice(txEvent, orderFindings, STONKS_ORDER_CREATION);
  handleEventsOfNotice(txEvent, findings, TREASURY_SWAP_EVENTS_OF_NOTICE);

  if (orderFindings.length > 0) {
    orderFindings.map((event) => {
      createdOrders.push(
        createOrderWatchEvent(event.metadata.args.split(",")[0], event.timestamp)
      );
      return event.metadata.args.split(",")[0];
    });
  }

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
