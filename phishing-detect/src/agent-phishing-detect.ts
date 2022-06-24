import BigNumber from "bignumber.js";

import { Event } from "ethers";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
  LogDescription,
  getTransactionReceipt,
} from "forta-agent";

import {
  etherscanLink,
  formatTokensWithApprovers,
  makeTopSummary,
} from "./utils/formatting";

import {
  ETH_DECIMALS,
  ALERT_SILENCE_PERIOD,
  UNIQ_DELEGATES_THRESHOLD_EOA,
  UNIQ_DELEGATES_CHANGE_THRESHOLD_EOA,
  UNIQ_DELEGATES_THRESHOLD_CONTRACT,
  UNIQ_DELEGATES_CHANGE_THRESHOLD_CONTRACT,
  UNIQ_TOKENS_THRESHOLD,
  UNIQ_TOKENS_CHANGE_THRESHOLD,
  APPROVE_EVENT_ABI,
  MONITORED_ERC20_ADDRESSES,
  WHITE_LIST_ADDRESSES,
} from "./constants";

import { isContract } from "./utils/tools";
import {
  ILastAlerted,
  ILastAlertedSummary,
  ISpenderInfo,
} from "./utils/interfaces";

const notAlerted: ILastAlerted = {
  count: 0,
  lastAlerted: 0,
};

let spenders = new Map<string, ISpenderInfo>();
let spendersLastAlerted = new Map<string, ILastAlertedSummary>();

const bigZero = new BigNumber(0);
const uintMaxValue = new BigNumber(10).pow(59);

export const name = "PhishingDetect";

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  return {};
}

function getLastAlertedTokensInfo(spender: string): ILastAlerted {
  const spenderLastAlerted = spendersLastAlerted.get(spender);
  if (!spenderLastAlerted || !spenderLastAlerted.tokens) {
    return notAlerted;
  }
  return spenderLastAlerted.tokens;
}

function setLastAlertedTokensInfo(
  spender: string,
  tokensCount: number,
  timeAlerted: number
) {
  const tokensAlertedInfoNew = {
    count: tokensCount,
    lastAlerted: timeAlerted,
  };
  let spenderLastAlerted = spendersLastAlerted.get(spender);
  if (!spenderLastAlerted) {
    spendersLastAlerted.set(spender, { tokens: tokensAlertedInfoNew });
  } else {
    spenderLastAlerted.tokens = tokensAlertedInfoNew;
    spendersLastAlerted.set(spender, spenderLastAlerted);
  }
}

function getLastAlertedApprovalsInfo(
  spender: string,
  token: string
): ILastAlerted {
  const spenderLastAlerted = spendersLastAlerted.get(spender);
  if (!spenderLastAlerted || !spenderLastAlerted.approvals) {
    return notAlerted;
  }
  const tokenApprovalsLastAlerted = spenderLastAlerted.approvals.get(token);
  if (!tokenApprovalsLastAlerted) {
    return notAlerted;
  }
  return tokenApprovalsLastAlerted;
}

function setLastAlertedApprovalsInfo(
  spender: string,
  token: string,
  approvalsCount: number,
  timeAlerted: number
) {
  const approvalsAlertedInfoNew = {
    count: approvalsCount,
    lastAlerted: timeAlerted,
  };
  const spenderLastAlerted = spendersLastAlerted.get(spender);
  if (!spenderLastAlerted) {
    spendersLastAlerted.set(spender, {
      approvals: new Map([[token, approvalsAlertedInfoNew]]),
    });
    return;
  }
  if (!spenderLastAlerted.approvals) {
    spenderLastAlerted.approvals = new Map([[token, approvalsAlertedInfoNew]]);
    spendersLastAlerted.set(spender, spenderLastAlerted);
    return;
  }
  spenderLastAlerted.approvals.set(token, approvalsAlertedInfoNew);
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (blockEvent.blockNumber % 300 == 0) {
    console.log(makeTopSummary(spenders));
  }

  return findings;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  let status;
  try {
    status = (await getTransactionReceipt(txEvent.hash)).status;
  } catch (err) {
    // https://web3js.readthedocs.io/en/v1.2.11/web3-eth.html#gettransactionreceipt
    console.log(
      `Receipt for tx ${txEvent.hash} isn't available. Probably tx is a pending at the moment`
    );
    return findings;
  }
  if (!status) return findings;

  const approvalEvents = txEvent
    .filterLog(APPROVE_EVENT_ABI)
    .filter((event: LogDescription) =>
      Array.from(MONITORED_ERC20_ADDRESSES.keys()).includes(event.address)
    );

  await Promise.all(
    approvalEvents.map((event: LogDescription) => {
      handleERC20Approval(event, txEvent, findings);
    })
  );

  return findings;
}

async function handleERC20Approval(
  event: LogDescription,
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const from = txEvent.from.toLowerCase();
  const now = txEvent.block.timestamp;
  const token = event.address;
  const spender = event.args.spender.toLowerCase();
  const amount = new BigNumber(String(event.args.value)).div(ETH_DECIMALS);
  // handle only non-whitelisted addresses
  if (!WHITE_LIST_ADDRESSES.includes(spender)) {
    console.log(
      `New approval of ${MONITORED_ERC20_ADDRESSES.get(token)} ` +
        `from ${from} to ${spender} for ${
          amount.isGreaterThan(uintMaxValue) ? "infinite" : amount.toFixed(4)
        } ${MONITORED_ERC20_ADDRESSES.get(token)}` +
        `\ntxHash: ${txEvent.hash}`
    );

    let spenderInfo = spenders.get(spender);
    // update isContract to handle case when EOA is now contract
    if (spenderInfo) {
      spenderInfo.isContract = await isContract(spender);
    }
    // call of approve with 0 amount equals to approve removal
    if (amount.eq(bigZero)) {
      if (spenderInfo) {
        let tokenApprovers = spenderInfo.tokens.get(token);
        if (tokenApprovers) {
          tokenApprovers.delete(from);
          if (tokenApprovers.size != 0) {
            spenderInfo.tokens.set(token, tokenApprovers);
          } else {
            spenderInfo.tokens.delete(token);
          }
        }
        if (spenderInfo.tokens.size == 0) {
          spenders.delete(spender);
        }
      }
    } else {
      if (spenderInfo) {
        // alert should be critical if spender is not contract
        const severity = spenderInfo.isContract
          ? FindingSeverity.High
          : FindingSeverity.Critical;

        let addressType = "undefined";
        let delegatesThreshold = 1;
        let delegatesChangeThreshold = 1;

        if (spenderInfo.isContract) {
          addressType = "contract";
          delegatesThreshold = UNIQ_DELEGATES_THRESHOLD_CONTRACT;
          delegatesChangeThreshold = UNIQ_DELEGATES_CHANGE_THRESHOLD_CONTRACT;
        } else {
          addressType = "EOA";
          delegatesThreshold = UNIQ_DELEGATES_THRESHOLD_EOA;
          delegatesChangeThreshold = UNIQ_DELEGATES_CHANGE_THRESHOLD_EOA;
        }

        let tokenApprovers = spenderInfo.tokens.get(token);
        if (tokenApprovers) {
          tokenApprovers.add(from);
          const lastAlertedApprovals = getLastAlertedApprovalsInfo(
            spender,
            token
          );
          if (
            (tokenApprovers.size >= delegatesThreshold &&
              now - lastAlertedApprovals.lastAlerted > ALERT_SILENCE_PERIOD) ||
            tokenApprovers.size - lastAlertedApprovals.count >
              delegatesChangeThreshold
          ) {
            findings.push(
              Finding.fromObject({
                name: `Significant amount of ERC20 approvals to the single address (${addressType})`,
                description:
                  `${tokenApprovers.size} addresses approved ` +
                  `${MONITORED_ERC20_ADDRESSES.get(token)} ` +
                  `tokens to ${spender} (${addressType})\n` +
                  `${etherscanLink(spender)}`,
                alertId: "HIGH-ERC20-APPROVALS",
                severity: severity,
                type: FindingType.Suspicious,
                metadata: {
                  spender: spender,
                  token: token,
                  approvers: `[${Array.from(tokenApprovers).join(", ")}]`,
                },
              })
            );
            setLastAlertedApprovalsInfo(
              spender,
              token,
              tokenApprovers.size,
              now
            );
          }
        } else {
          tokenApprovers = new Set([from]);
        }
        spenderInfo.tokens.set(token, tokenApprovers);
        const lastAlertedTokens = getLastAlertedTokensInfo(spender);
        if (
          (spenderInfo.tokens.size >= UNIQ_TOKENS_THRESHOLD &&
            now - lastAlertedTokens.lastAlerted > ALERT_SILENCE_PERIOD) ||
          spenderInfo.tokens.size - lastAlertedTokens.count >
            UNIQ_TOKENS_CHANGE_THRESHOLD
        ) {
          const tokensArray = Array.from(spenderInfo.tokens.keys());
          const tokensReadable = tokensArray.map((token) =>
            MONITORED_ERC20_ADDRESSES.get(token)
          );
          findings.push(
            Finding.fromObject({
              name: `Significant amount of ERC20 types approvals to the single address (${addressType})`,
              description:
                `${spenderInfo.tokens.size} ` +
                `types of tokens (${tokensReadable.join(", ")}) ` +
                `approved to ${spender} (${addressType})` +
                `\n${etherscanLink(spender)}`,
              alertId: "HIGH-ERC20-TOKENS",
              severity: severity,
              type: FindingType.Suspicious,
              metadata: {
                spender: spender,
                tokens: `[${tokensArray.join(", ")}]`,
                tokensReadable: `[${tokensReadable.join(", ")}]`,
                tokenApprovers: formatTokensWithApprovers(spenderInfo),
              },
            })
          );
          setLastAlertedTokensInfo(spender, spenderInfo.tokens.size, now);
        }
      } else {
        spenderInfo = {
          tokens: new Map([[token, new Set([from])]]),
          isContract: await isContract(spender),
        };
      }
      spenders.set(spender, spenderInfo);
    }
  }
}
