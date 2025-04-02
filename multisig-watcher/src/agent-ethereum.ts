import {
  ethers,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import {
  APPROVAL_EVENT,
  BIG_ALLOWANCES,
  Blockchain,
  getSafeLink,
  GNOSIS_SAFE_EVENTS_OF_NOTICE,
  LIDO_AGENT_ETHEREUM,
  SAFES,
} from "./constants";
import { eventSig } from "./helpers";
import { etherscanAddress, formatTokenAmount } from "./utils";

export const name = "Ethereum-multisig-watcher";

const blockchain = Blockchain.ETH;
const safes = SAFES[blockchain];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}] initialized on block ${currentBlock}`);

  return {};
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const safeEventsFindings = handleSafeEvents(txEvent);
  const approvalEventsFindings = handleApprovalEvents(txEvent);

  return [...safeEventsFindings, ...approvalEventsFindings];
}

export function handleSafeEvents(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  safes.forEach(([safeAddress, safeName]) => {
    if (safeAddress in txEvent.addresses) {
      GNOSIS_SAFE_EVENTS_OF_NOTICE.forEach((eventInfo) => {
        const events = txEvent.filterLog(eventInfo.event, safeAddress);
        events.forEach((event) => {
          const safeInfo = {
            tx: txEvent.transaction.hash,
            safeAddress: safeAddress,
            safeName: safeName,
            safeTx: event.args.txHash || "",
            blockchain: blockchain,
          };
          findings.push(
            Finding.fromObject({
              name: eventInfo.name,
              description: eventInfo.description(safeInfo, event.args),
              alertId: eventInfo.alertId,
              severity: eventInfo.severity,
              type: FindingType.Info,
              metadata: { args: String(event.args) },
            })
          );
        });
      });
    }
  });

  return findings;
}

export function handleApprovalEvents(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  const approvalInterface = new ethers.utils.Interface([APPROVAL_EVENT]);
  const approvalLogs = txEvent.logs.filter(
    (log) => log.topics[0] === ethers.utils.id(eventSig(APPROVAL_EVENT))
  );

  for (const log of approvalLogs) {
    try {
      const parsedLog = approvalInterface.parseLog(log);

      const safeOwner = safes.find(
        (safe) => safe[0].toLowerCase() === parsedLog.args.owner.toLowerCase()
      );
      if (!safeOwner) {
        continue;
      }

      const safeInfo = {
        tx: txEvent.transaction.hash,
        safeAddress: safeOwner[0],
        safeName: safeOwner[1],
        safeTx: parsedLog.args.txHash || "",
        blockchain,
      };

      const spender = parsedLog.args.spender.toLowerCase();
      const value = parsedLog.args.value;

      if (spender === LIDO_AGENT_ETHEREUM && value.eq(0)) {
        findings.push(
          Finding.fromObject({
            name: "🚨 Gnosis Safe: Token approval revoked",
            description: `Safe token approval given to Aragon agent contract has been revoked.
            \nOwner: ${getSafeLink(safeInfo)}.`,
            alertId: "SAFE-APPROVAL-REVOKED",
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
            metadata: { args: String(parsedLog.args) },
          })
        );
        continue;
      }

      if (spender !== LIDO_AGENT_ETHEREUM) {
        const tokenAddress = log.address.toLowerCase();
        const bigAllowanceInfo = BIG_ALLOWANCES[tokenAddress];

        const bigAllowance = bigAllowanceInfo
          ? ethers.utils.parseUnits(
              bigAllowanceInfo.allowance,
              bigAllowanceInfo.decimals
            )
          : ethers.utils.parseUnits("500000", 18);

        if (value.eq(ethers.constants.MaxUint256)) {
          findings.push(
            Finding.fromObject({
              name: "🚨 Gnosis Safe: Unlimited allowance has been granted",
              description: `Unlimited allowance has been granted to an address other than the Aragon Agent.
              \nOwner: ${getSafeLink(safeInfo)}.
              \nSpender: ${etherscanAddress(blockchain, spender)}.`,
              alertId: "SAFE-UNLIMITED-ALLOWANCE",
              severity: FindingSeverity.Medium,
              type: FindingType.Info,
              metadata: { args: String(parsedLog.args) },
            })
          );
        } else if (value.gte(bigAllowance)) {
          const approvedAmount = bigAllowanceInfo
            ? formatTokenAmount(value, bigAllowanceInfo.decimals)
            : `${value} (raw value)`;

          findings.push(
            Finding.fromObject({
              name: "🚨 Gnosis Safe: A large allowance has been approved",
              description: `A large allowance has been approved for a spender other than the Aragon Agent.
              \nOwner: ${getSafeLink(safeInfo)}.
              \nSpender: ${etherscanAddress(blockchain, spender)}.
              \nApproved amount: ${approvedAmount}.`,
              alertId: "SAFE-BIG-ALLOWANCE",
              severity: FindingSeverity.Medium,
              type: FindingType.Info,
              metadata: { args: String(parsedLog.args) },
            })
          );
        }
      }
    } catch (error: any) {
      // For Approval events where the 'value' is indexed, it should just skip the event
      if (log.topics.length <= 3) {
        findings.push(
          Finding.fromObject({
            name: `${name} error in handleApprovalEvents`,
            description: "Failed to parse log",
            alertId: "NETWORK-ERROR",
            severity: FindingSeverity.Unknown,
            type: FindingType.Degraded,
            metadata: {
              tx: txEvent.transaction.hash,
              error,
            },
          })
        );
      }
      continue;
    }
  }

  return findings;
}
