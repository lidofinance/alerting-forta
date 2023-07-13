import BigNumber from "bignumber.js";

import {
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
  LogDescription,
} from "forta-agent";

import { etherscanLink } from "./utils/formatting";

import {
  ETH_DECIMALS,
  UNIQ_DELEGATES_THRESHOLD_EOA,
  UNIQ_DELEGATES_THRESHOLD_CONTRACT,
  MONITORED_ERC20_ADDRESSES,
  WHITE_LIST_ADDRESSES,
  PHISHING_LIST_ADDRESSES,
  BLOCKS_PER_HOUR,
  ERC_20_APPROVAL_EVENT_ABI,
  ERC721_APPROVAL_EVENT_ABI,
  ERC721_APPROVAL_FOR_ALL_EVENT_ABI,
  WITHDRAWAL_QUEUE_ADDRESS,
} from "./constants";

import { isContract } from "./utils/tools";
import { ISpenderInfo } from "./utils/interfaces";
import { description } from "../../../lodestar-blocktiming-scrapper/packages/cli/src/cmds/account/cmds/wallet/create";

export const spenders = new Map<string, ISpenderInfo>();

export const name = "PhishingDetect";

export async function initialize(
  _: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (blockEvent.blockNumber % BLOCKS_PER_HOUR == 0) {
    await handleSpenders(findings);
  }

  return findings;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  txEvent
    .filterLog(ERC_20_APPROVAL_EVENT_ABI)
    .filter((event: LogDescription) =>
      Array.from(MONITORED_ERC20_ADDRESSES.keys()).includes(event.address),
    )
    .map(handleERC20Approval);

  txEvent
    .filterLog(ERC721_APPROVAL_EVENT_ABI)
    .filter(
      (event: LogDescription) => event.address === WITHDRAWAL_QUEUE_ADDRESS,
    )
    .map((event: LogDescription) => {
      createOrUpdateSpender(
        event.args.approved.toLowerCase(),
        event.address,
        event.args.owner.toLowerCase(),
      );
    });

  txEvent
    .filterLog(ERC721_APPROVAL_FOR_ALL_EVENT_ABI)
    .filter(
      (event: LogDescription) => event.address === WITHDRAWAL_QUEUE_ADDRESS,
    )
    .filter((event: LogDescription) => event.args.approved)
    .map((event: LogDescription) => {
      createOrUpdateSpender(
        event.args.operator.toLowerCase(),
        event.address,
        event.args.owner.toLowerCase(),
      );
    });

  return findings;
}

function handleERC20Approval(event: LogDescription) {
  const from = event.args.owner.toLowerCase();
  const token = event.address;
  const spender = event.args.spender.toLowerCase();
  const amount = new BigNumber(String(event.args.value)).div(ETH_DECIMALS);
  // handle only non-whitelisted addresses
  if (!WHITE_LIST_ADDRESSES.includes(spender)) {
    if (!amount.eq(0)) {
      createOrUpdateSpender(spender, token, from);
    }
  }
}

function createOrUpdateSpender(spender: string, token: string, from: string) {
  let spenderInfo = spenders.get(spender);
  if (spenderInfo) {
    let tokenApprovers = spenderInfo.tokens.get(token);
    if (tokenApprovers) {
      tokenApprovers.add(from);
    } else {
      tokenApprovers = new Set([from]);
    }
    spenderInfo.tokens.set(token, tokenApprovers);
  } else {
    spenders.set(spender, {
      tokens: new Map([[token, new Set([from])]]),
      reportedApproversCount: 0,
      reportedTokenTypesCount: 0,
    });
  }
}

async function handleSpenders(findings: Finding[]) {
  await Promise.all(
    Array.from(spenders.keys()).map(async (spender) => {
      let spenderInfo = spenders.get(spender);
      if (!spenderInfo) {
        return;
      }
      if (spenderInfo.isContract == undefined) {
        spenderInfo.isContract = await isContract(spender);
      }
      const uniqApprovers = Array.from(spenderInfo.tokens.values()).reduce(
        (tmpSum, tokenApprovers) => tmpSum + tokenApprovers.size,
        0,
      );
      const UNIQ_DELEGATES_THRESHOLD = spenderInfo.isContract
        ? UNIQ_DELEGATES_THRESHOLD_CONTRACT
        : UNIQ_DELEGATES_THRESHOLD_EOA;

      const addressType = spenderInfo.isContract ? "CONTRACT" : "EOA";
      let severity = spenderInfo.isContract
        ? FindingSeverity.Medium
        : FindingSeverity.High;
      let knownPhishing = PHISHING_LIST_ADDRESSES.includes(spender);
      let description =
        `A significant number of addresses has approved Lido tokens to ` +
        `${etherscanLink(spender)} (${addressType}).`;
      if (knownPhishing) {
        severity = FindingSeverity.Low;
        description += `This address is know as phishing. We need to figure out how to stop it!`;
      } else {
        description += ` Looks like a phishing at a glance`;
      }

      if (
        uniqApprovers >= UNIQ_DELEGATES_THRESHOLD &&
        uniqApprovers > spenderInfo.reportedApproversCount
      ) {
        findings.push(
          Finding.fromObject({
            name: knownPhishing
              ? `🕵️ Known phishing ${addressType.toLocaleLowerCase()} ${spender} detected`
              : `🕵️ Suspicious ${addressType.toLocaleLowerCase()} ${spender} detected`,
            description,
            alertId: `PHISHING-${addressType}-DETECTED`,
            severity,
            type: FindingType.Suspicious,
            metadata: { spender },
          }),
        );
        spenderInfo.reportedApproversCount = uniqApprovers;
      }
    }),
  );
}
