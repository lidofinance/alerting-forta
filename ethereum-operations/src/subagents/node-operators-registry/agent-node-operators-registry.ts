import {
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { handleEventsOfNotice, requireConstants } from "../../common/utils";
import * as _constants from "./constants";

export const name = "NodeOperatorsRegistry";

export let constants: typeof _constants;
try {
  constants = requireConstants(`${module.path}/constants`);
} catch (e: any) {
  if (e?.code == "MODULE_NOT_FOUND") {
    // Do nothing. `constants` will be undefined and sub-agent will be disabled
  } else {
    throw e;
  }
}

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleEventsOfNotice(
    txEvent,
    findings,
    constants.NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE
  );
  handleSigningKeysRemoved(txEvent, findings);
  handleStakeLimitSet(txEvent, findings);

  return findings;
}

function handleSigningKeysRemoved(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (constants.NODE_OPERATORS_REGISTRY_ADDRESS in txEvent.addresses) {
    const events = txEvent.filterLog(
      constants.SIGNING_KEY_REMOVED_EVENT,
      constants.NODE_OPERATORS_REGISTRY_ADDRESS
    );
    if (events.length > 0) {
      findings.push(
        Finding.fromObject({
          name: "🚨 NO Registry: Signing keys removed",
          description: `${events.length} signing keys removed`,
          alertId: "NODE-OPERATORS-KEYS-REMOVED",
          severity: FindingSeverity.High,
          type: FindingType.Info,
        })
      );
    }
  }
}

function handleStakeLimitSet(txEvent: TransactionEvent, findings: Finding[]) {
  if (constants.NODE_OPERATORS_REGISTRY_ADDRESS in txEvent.addresses) {
    const noLimitEvents = txEvent.filterLog(
      constants.NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
      constants.NODE_OPERATORS_REGISTRY_ADDRESS
    );
    const motionEnactedEvents = txEvent.filterLog(
      constants.MOTION_ENACTED_EVENT,
      constants.EASY_TRACK_ADDRESS
    );
    noLimitEvents.forEach((event) => {
      if (motionEnactedEvents.length < 1) {
        findings.push(
          Finding.fromObject({
            name: "🚨 NO Stake limit set by NON-EasyTrack action",
            description: `Staking limit for node operator ${event.args.id} was set to ${event.args.stakingLimit} by NON-EasyTrack motion!`,
            alertId: "NODE-OPERATORS-STAKING-LIMIT-SET",
            severity: FindingSeverity.High,
            type: FindingType.Info,
          })
        );
      }
    });
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
