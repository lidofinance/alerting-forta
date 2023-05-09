import {
  ethers,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import {
  EASY_TRACK_ADDRESS,
  NODE_OPERATORS_REGISTRY_ADDRESS,
} from "../../common/constants";

import {
  INCREASE_STAKING_LIMIT_ADDRESS,
  EASY_TRACK_EVENTS_OF_NOTICE,
  MOTION_CREATED_EVENT,
} from "./constants";

import INCREASE_STAKING_LIMIT_ABI from "../../abi_v1/IncreaseStakingLimit.json";
import NODE_OPERATORS_REGISTRY_ABI from "../../abi_v1/NodeOperatorsRegistry.json";
import { getMotionLink, getMotionType } from "./utils";
import { handleEventsOfNotice } from "../../common/utils";

export const name = "EasyTrack";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  handleEventsOfNotice(txEvent, findings, EASY_TRACK_EVENTS_OF_NOTICE);
  await handleEasyTrackMotionCreated(txEvent, findings);

  return findings;
}

async function handleEasyTrackMotionCreated(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (EASY_TRACK_ADDRESS in txEvent.addresses) {
    const events = txEvent.filterLog(MOTION_CREATED_EVENT, EASY_TRACK_ADDRESS);
    await Promise.all(
      events.map(async (event) => {
        const args = event.args;
        let alertName = "ℹ EasyTrack: New motion created";
        let description =
          `${getMotionType(args._evmScriptFactory)} ` +
          `motion ${getMotionLink(args._motionId)} created by ${args._creator}`;
        if (
          args._evmScriptFactory.toLowerCase() == INCREASE_STAKING_LIMIT_ADDRESS
        ) {
          const stakingLimitFactory = new ethers.Contract(
            INCREASE_STAKING_LIMIT_ADDRESS,
            INCREASE_STAKING_LIMIT_ABI,
            ethersProvider
          );
          const nor = new ethers.Contract(
            NODE_OPERATORS_REGISTRY_ADDRESS,
            NODE_OPERATORS_REGISTRY_ABI,
            ethersProvider
          );
          const { _nodeOperatorId, _stakingLimit } =
            await stakingLimitFactory.decodeEVMScriptCallData(
              args._evmScriptCallData
            );
          const { name, totalSigningKeys } = await nor.getNodeOperator(
            _nodeOperatorId,
            1
          );
          description += `\nOperator ${name} wants to increase staking limit to **${_stakingLimit.toNumber()}**.`;
          if (totalSigningKeys.toNumber() < _stakingLimit.toNumber()) {
            alertName = alertName.replace("ℹ", "⚠️");
            description +=
              `\nBut operator has not enough keys uploaded! ⚠️` +
              `\nRequired: ${_stakingLimit.toNumber()}` +
              `\nAvailable: ${totalSigningKeys.toNumber()}`;
          } else {
            description += `\nNo issues with keys! ✅`;
          }
        }
        findings.push(
          Finding.fromObject({
            name: alertName,
            description: description,
            alertId: "EASY-TRACK-MOTION-CREATED",
            severity: FindingSeverity.Info,
            type: FindingType.Info,
            metadata: { args: String(args) },
          })
        );
      })
    );
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleTransaction,
  initialize, // sdk won't provide any arguments to the function
};
