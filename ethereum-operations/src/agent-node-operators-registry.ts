import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import {
  EASY_TRACK_ADDRESS,
  NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
  NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE,
  NODE_OPERATORS_REGISTRY_ADDRESS,
  SIGNING_KEY_REMOVED_EVENT,
} from "./constants";

export const name = "NodeOperatorsRegistry";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleEventsOfNotice(txEvent, findings);
  handleSigningKeysRemoved(txEvent, findings);
  handleStakeLimitSet(txEvent, findings);

  return findings;
}

function handleSigningKeysRemoved(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (NODE_OPERATORS_REGISTRY_ADDRESS in txEvent.addresses) {
    const events = txEvent.filterLog(
      SIGNING_KEY_REMOVED_EVENT,
      NODE_OPERATORS_REGISTRY_ADDRESS
    );
    if (events.length > 0) {
      findings.push(
        Finding.fromObject({
          name: "NO Registry: Signing keys removed",
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
  if (NODE_OPERATORS_REGISTRY_ADDRESS in txEvent.addresses) {
    const events = txEvent.filterLog(
      NODE_OPERATOR_STAKING_LIMIT_SET_EVENT,
      NODE_OPERATORS_REGISTRY_ADDRESS
    );
    events.forEach((event) => {
      if (txEvent.to != EASY_TRACK_ADDRESS) {
        findings.push(
          Finding.fromObject({
            name: "NO Stake limit set by NON-EasyTrack action",
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

function handleEventsOfNotice(txEvent: TransactionEvent, findings: Finding[]) {
  NODE_OPERATORS_REGISTRY_EVENTS_OF_NOTICE.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
        );
      });
    }
  });
}
