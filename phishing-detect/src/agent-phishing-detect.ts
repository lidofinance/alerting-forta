import BigNumber from "bignumber.js";

import {
  ethers,
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
  APPROVE_EVENT_ABI,
  MONITORED_ERC20_ADDRESSES,
  WHITE_LIST_ADDRESSES,
  BLOCKS_PER_HOUR,
} from "./constants";

import { isContract } from "./utils/tools";
import { ISpenderInfo } from "./utils/interfaces";

export const spenders = new Map<string, ISpenderInfo>();

export const name = "PhishingDetect";

export async function initialize(
  currentBlock: number
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

export function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  const approvalEvents = txEvent
    .filterLog(APPROVE_EVENT_ABI)
    .filter((event: LogDescription) =>
      Array.from(MONITORED_ERC20_ADDRESSES.keys()).includes(event.address)
    );

  approvalEvents.map((event: LogDescription) => {
    handleERC20Approval(event, txEvent);
  });

  return findings;
}

function handleERC20Approval(event: LogDescription, txEvent: TransactionEvent) {
  const from = txEvent.from.toLowerCase();
  const token = event.address;
  const spender = event.args.spender.toLowerCase();
  const amount = new BigNumber(String(event.args.value)).div(ETH_DECIMALS);
  // handle only non-whitelisted addresses
  if (!WHITE_LIST_ADDRESSES.includes(spender)) {
    let spenderInfo = spenders.get(spender);
    if (!amount.eq(0)) {
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
      const uniqTokenTypes = spenderInfo.tokens.size;
      const uniqApprovers = Array.from(spenderInfo.tokens.values()).reduce(
        (tmpSum, tokenApprovers) => tmpSum + tokenApprovers.size,
        0
      );
      const UNIQ_DELEGATES_THRESHOLD = spenderInfo.isContract
        ? UNIQ_DELEGATES_THRESHOLD_CONTRACT
        : UNIQ_DELEGATES_THRESHOLD_EOA;

      const addressType = spenderInfo.isContract ? "CONTRACT" : "EOA";

      if (
        uniqApprovers >= UNIQ_DELEGATES_THRESHOLD &&
        uniqApprovers > spenderInfo.reportedApproversCount
      ) {
        findings.push(
          Finding.fromObject({
            name: "Phishing detected",
            description:
              `Significant amount of address has approved Lido tokens to ` +
              `${etherscanLink(spender)}(${addressType})`,
            alertId: `PHISHING-${addressType}-DETECTED`,
            severity: spenderInfo.isContract
              ? FindingSeverity.High
              : FindingSeverity.Critical,
            type: FindingType.Suspicious,
            metadata: { spender },
          })
        );
        spenderInfo.reportedApproversCount = uniqApprovers;
      }
    })
  );
}
