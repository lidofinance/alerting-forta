import BigNumber from "bignumber.js";

import { Event } from "ethers";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { etherscanLink, makeSummary } from "./utils/formatting";

import {
  ETH_DECIMALS,
  ALERT_SILENCE_PERIOD,
  UNIQ_DELEGATES_THRESHOLD,
  UNIQ_DELEGATES_CHANGE_THRESHOLD,
  UNIQ_TOKENS_CHANGE_THRESHOLD,
  APPROVE_FUNCTION_ABI,
  INCREASE_ALLOWANCE_ABI,
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
    console.log(makeSummary(spenders))
  }

  return findings;
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (!txEvent.receipt.status || !txEvent.to) {
    return findings;
  }

  const token = txEvent.to.toLowerCase();

  // do not analyze non-Lido ERC20 tokens
  if (!Array.from(MONITORED_ERC20_ADDRESSES.keys()).includes(token)) {
    return findings;
  }

  const from = txEvent.from.toLowerCase();

  const approvals = txEvent.filterFunction(APPROVE_FUNCTION_ABI);
  const increase_allowance = txEvent.filterFunction(INCREASE_ALLOWANCE_ABI);
  const now = txEvent.block.timestamp;

  await Promise.all(
    approvals.map((event: ethers.utils.TransactionDescription) => {
      handleERC20FuncCall(event, "approve", from, token, now, findings);
    })
  );

  await Promise.all(
    increase_allowance.map((event: ethers.utils.TransactionDescription) => {
      handleERC20FuncCall(
        event,
        "increase_allowance",
        from,
        token,
        now,
        findings
      );
    })
  );

  return findings;
}

async function handleERC20FuncCall(
  event: ethers.utils.TransactionDescription,
  func: string,
  from: string,
  token: string,
  now: number,
  findings: Finding[]
) {
  const spender = event.args.spender.toLowerCase();
  const amount = new BigNumber(String(event.args.amount)).div(ETH_DECIMALS);
  // handle only non-whitelisted addresses
  if (!Object.values(WHITE_LIST_ADDRESSES).includes(spender)) {
    let spenderInfo = spenders.get(spender);

    console.log(
      `New ${func} of ${MONITORED_ERC20_ADDRESSES.get(
        token
      )} from ${from} to ${spender} for ${
        amount.isGreaterThan(uintMaxValue) ? "infinite" : amount.toFixed(4)
      } ${MONITORED_ERC20_ADDRESSES.get(token)}`
    );

    // call of approve with 0 amount equals to approve removal
    if (func == "approve" && amount.eq(bigZero)) {
      if (spenderInfo) {
        let spenderToken = spenderInfo.approvers.get(token);
        if (spenderToken) {
          spenderToken.delete(from);
          if (spenderToken.size != 0) {
            spenderInfo.approvers.set(token, spenderToken);
          } else {
            spenderInfo.approvers.delete(token);
          }
        }
      }
    } else {
      if (spenderInfo) {
        // alert should be critical if spender is not contract
        const severity = spenderInfo.isContract
          ? FindingSeverity.High
          : FindingSeverity.Critical;
        const addressType = spenderInfo.isContract ? "contract" : "EOA";
        let spenderToken = spenderInfo.approvers.get(token);
        if (spenderToken) {
          spenderToken.add(from);
          const lastAlertedApprovals = getLastAlertedApprovalsInfo(
            spender,
            token
          );
          if (
            (spenderToken.size >= UNIQ_DELEGATES_THRESHOLD &&
              now - lastAlertedApprovals.lastAlerted > ALERT_SILENCE_PERIOD) ||
            spenderToken.size - lastAlertedApprovals.count >
              UNIQ_DELEGATES_CHANGE_THRESHOLD
          ) {
            findings.push(
              Finding.fromObject({
                name: `Significant amount of ERC20 approvals to the single address (${addressType})`,
                description:
                  `${spenderToken.size} addresses approved` +
                  ` ${MONITORED_ERC20_ADDRESSES.get(token)}` +
                  ` tokens to ${spender} (${addressType})` +
                  `\n${etherscanLink(spender)}`,
                alertId: "HIGH-ERC20-APPROVALS",
                severity: severity,
                type: FindingType.Suspicious,
                metadata: {
                  spender: spender,
                  token: token,
                  approvers: `[${Array.from(spenderToken).join(", ")}]`,
                },
              })
            );
            setLastAlertedApprovalsInfo(spender, token, spenderToken.size, now);
          }
        } else {
          spenderToken = new Set([from]);
        }
        spenderInfo.approvers.set(token, spenderToken);
        const lastAlertedTokens = getLastAlertedTokensInfo(spender);
        if (
          (spenderInfo.approvers.size >= UNIQ_DELEGATES_THRESHOLD &&
            now - lastAlertedTokens.lastAlerted > ALERT_SILENCE_PERIOD) ||
          spenderInfo.approvers.size - lastAlertedTokens.count >
            UNIQ_TOKENS_CHANGE_THRESHOLD
        ) {
          const tokensArray = Array.from(spenderInfo.approvers.keys());
          const tokensReadable = tokensArray.map((token) =>
            MONITORED_ERC20_ADDRESSES.get(token)
          );
          findings.push(
            Finding.fromObject({
              name: `Significant amount of ERC20 types approvals to the single address (${addressType})`,
              description:
                `${
                  spenderInfo.approvers.size
                } types of tokens (${tokensReadable.join(", ")}) ` +
                `approved to ${spender} (${addressType})` +
                `\n${etherscanLink(spender)}`,
              alertId: "HIGH-ERC20-TOKENS",
              severity: severity,
              type: FindingType.Suspicious,
              metadata: {
                spender: spender,
                tokens: `[${tokensArray.join(", ")}]`,
                tokensReadable: `[${tokensReadable.join(", ")}]`,
              },
            })
          );
          setLastAlertedTokensInfo(spender, spenderInfo.approvers.size, now);
        }
      } else {
        spenderInfo = {
          approvers: new Map([[token, new Set([from])]]),
          isContract: await isContract(spender),
        };
      }
      spenders.set(spender, spenderInfo);
    }
  }
}
