import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import WITHDRAWAL_QUEUE_ABI from "../../abi/WithdrawalQueueERC721.json";

import { formatDelay } from "./utils";
import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";
import BigNumber from "bignumber.js";
import { ONE_DAY } from "../../common/constants";

// re-fetched from history on startup
let lastFinalizedBatchTimestamp = 0;

let lastBigUnfinalizedQueueAlertTimestamp = 0;
let lastLongUnfinalizedQueueAlertBlockNumber = 0;

let isBunkerMode = false;
let bunkerModeEnabledSinceTimestamp = 0;

let lastTokenRebaseTimestamp = 0;
let amountOfRequestedStETHSinceLastTokenRebase = new BigNumber(0);
let lastBigRequestAfterRebaseAlertTimestamp = 0;

export const name = "Withdrawals";

const {
  LIDO_ADDRESS,
  LIDO_TOKEN_REBASED,
  WITHDRAWALS_BUNKER_MODE_ENABLED,
  WITHDRAWALS_BUNKER_MODE_DISABLED,
  WITHDRAWAL_QUEUE_ADDRESS,
  WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED,
  WITHDRAWAL_QUEUE_WITHDRAWAL_BATCH_FINALIZED,
  WITHDRAWALS_EVENTS_OF_NOTICE,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge
);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const withdrawal = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );
  [isBunkerMode] = await withdrawal.functions.isBunkerModeActive({
    blockTag: currentBlock,
  });
  if (isBunkerMode) {
    const since = await withdrawal.functions.bunkerModeSinceTimestamp({
      blockTag: currentBlock,
    });
    bunkerModeEnabledSinceTimestamp = Number(since);
  }

  const [lastFinalizedRequestId] =
    await withdrawal.functions.getLastFinalizedRequestId({
      blockTag: currentBlock,
    });
  lastFinalizedBatchTimestamp = Number(
    (
      await withdrawal.functions.getWithdrawalStatus(
        [String(lastFinalizedRequestId)],
        { blockTag: currentBlock }
      )
    ).statuses[0].timestamp
  );

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await handleUnfinalizedRequestNumber(blockEvent, findings);

  return findings;
}

async function handleUnfinalizedRequestNumber(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const withdrawal = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );
  const now = blockEvent.block.timestamp;

  if (lastBigUnfinalizedQueueAlertTimestamp < lastFinalizedBatchTimestamp) {
    const [result] = await withdrawal.functions.unfinalizedStETH({
      blockTag: blockEvent.blockNumber,
    });
    const unfinalizedStETH = new BigNumber(String(result)).div(
      new BigNumber(10).pow(18)
    );
    if (unfinalizedStETH.gte(100000)) {
      // if alert hasn't been sent after last finalized batch
      // and unfinalized queue is more than 100k StETH
      findings.push(
        Finding.fromObject({
          name: "⚠️ Withdrawals: unfinalized queue is more than 100k StETH",
          description: `Unfinalized queue is ${unfinalizedStETH.toFixed(
            0
          )} ETH`,
          alertId: "WITHDRAWALS-BIG-UNFINALIZED-QUEUE",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      lastBigUnfinalizedQueueAlertTimestamp = now;
    }
  }

  if (!isBunkerMode) {
    if (now - 5 * ONE_DAY > lastFinalizedBatchTimestamp) {
      if (now - lastLongUnfinalizedQueueAlertBlockNumber > ONE_DAY) {
        // if we are in turbo mode and unfinalized queue is not finalized for 5 days
        // and alert hasn't been sent for 1 day
        findings.push(
          Finding.fromObject({
            name: "⚠️ Withdrawals: unfinalized queue wait time is too long",
            description: `Unfinalized queue wait time is ${formatDelay(
              now - lastFinalizedBatchTimestamp
            )}`,
            alertId: "WITHDRAWALS-LONG-UNFINALIZED-QUEUE",
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          })
        );
        lastLongUnfinalizedQueueAlertBlockNumber = now;
      }
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await handleBunkerStatus(txEvent, findings);
  await handleLastTokenRebase(txEvent);
  await handleWithdrawalBatchFinalized(txEvent);
  await handleWithdrawalRequest(txEvent, findings);

  handleEventsOfNotice(txEvent, findings, WITHDRAWALS_EVENTS_OF_NOTICE);

  return findings;
}

async function handleWithdrawalBatchFinalized(txEvent: TransactionEvent) {
  const [withdrawalEvents] = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWAL_BATCH_FINALIZED,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  if (!withdrawalEvents) return;
  lastFinalizedBatchTimestamp = Number(withdrawalEvents.args.timestamp);
}

async function handleLastTokenRebase(txEvent: TransactionEvent) {
  const [rebaseEvents] = txEvent.filterLog(LIDO_TOKEN_REBASED, LIDO_ADDRESS);
  if (!rebaseEvents) return;
  lastTokenRebaseTimestamp = txEvent.timestamp;
  amountOfRequestedStETHSinceLastTokenRebase = new BigNumber(0);
}

async function handleWithdrawalRequest(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const withdrawalEvents = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  const amountOfStETH = withdrawalEvents
    .reduce(
      (acc, event) => acc.plus(event.args.amountOfStETH),
      new BigNumber(0)
    )
    .div(new BigNumber(10).pow(18));
  if (amountOfStETH.gte(50000)) {
    const requestor = withdrawalEvents[0].args.requestor;
    findings.push(
      Finding.fromObject({
        name: "ℹ️ Withdrawals: received withdrawal request greater than 50k stETH in one batch",
        description: `Requestor: ${requestor}\nAmount: ${amountOfStETH.toFixed(
          0
        )} stETH`,
        alertId: "WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-BATCH",
        severity: FindingSeverity.Medium,
        type: FindingType.Info,
      })
    );
  }
  amountOfRequestedStETHSinceLastTokenRebase =
    amountOfRequestedStETHSinceLastTokenRebase.plus(amountOfStETH);
  if (amountOfRequestedStETHSinceLastTokenRebase.gte(150000)) {
    if (lastBigRequestAfterRebaseAlertTimestamp < lastTokenRebaseTimestamp) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Withdrawals: received withdrawal request greater than 150k stETH since the last rebase",
          description: `Amount: ${amountOfRequestedStETHSinceLastTokenRebase.toFixed(
            0
          )} stETH`,
          alertId: "WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-AFTER-REBASE",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      lastBigRequestAfterRebaseAlertTimestamp = txEvent.timestamp;
    }
  }
}

async function handleBunkerStatus(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const [bunkerEnabled] = txEvent.filterLog(
    WITHDRAWALS_BUNKER_MODE_ENABLED,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  if (bunkerEnabled) {
    isBunkerMode = true;
    bunkerModeEnabledSinceTimestamp = Number(
      bunkerEnabled.args._sinceTimestamp
    );
    findings.push(
      Finding.fromObject({
        name: "🚨 Withdrawals: BUNKER MODE ON! 🚨",
        description: `Started from ${new Date(
          bunkerModeEnabledSinceTimestamp
        ).toUTCString()}`,
        alertId: "WITHDRAWALS-BUNKER-ENABLED",
        severity: FindingSeverity.Critical,
        type: FindingType.Degraded,
      })
    );
    return;
  }
  const [bunkerDisabled] = txEvent.filterLog(
    WITHDRAWALS_BUNKER_MODE_DISABLED,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  if (bunkerDisabled) {
    isBunkerMode = false;
    const delay = formatDelay(
      txEvent.block.timestamp - bunkerModeEnabledSinceTimestamp
    );
    findings.push(
      Finding.fromObject({
        name: "✅ Withdrawals: BUNKER MODE OFF! ✅",
        description: `Bunker lasted ${delay}`,
        alertId: "WITHDRAWALS-BUNKER-DISABLED",
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
      })
    );
    return;
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
