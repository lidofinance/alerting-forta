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
import { ETH_DECIMALS } from "../../common/constants";

// re-fetched from history on startup
let lastFinalizedRequestId = 0;
let lastFinalizedBatchTimestamp = 0;
let firstUnfinalizedRequestTimestamp = 0;

let lastBigUnfinalizedQueueAlertTimestamp = 0;
let lastLongUnfinalizedQueueAlertTimestamp = 0;

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
  BIG_WITHDRAWAL_REQUEST_THRESHOLD,
  BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD,
  BIG_UNFINALIZED_QUEUE_THRESHOLD,
  LONG_UNFINALIZED_QUEUE_THRESHOLD,
  LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge
);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );
  [isBunkerMode] = await withdrawalNFT.functions.isBunkerModeActive({
    blockTag: currentBlock,
  });
  if (isBunkerMode) {
    bunkerModeEnabledSinceTimestamp = Number(
      await withdrawalNFT.functions.bunkerModeSinceTimestamp({
        blockTag: currentBlock,
      })
    );
  }

  lastFinalizedRequestId = Number(
    (
      await withdrawalNFT.functions.getLastFinalizedRequestId({
        blockTag: currentBlock,
      })
    )[0]
  );
  const lastRequestId = Number(
    (
      await withdrawalNFT.functions.getLastRequestId({
        blockTag: currentBlock,
      })
    )[0]
  );
  lastFinalizedBatchTimestamp = Number(
    (
      await withdrawalNFT.functions.getWithdrawalStatus(
        [lastFinalizedRequestId],
        { blockTag: currentBlock }
      )
    ).statuses[0].timestamp
  );
  const diff = lastRequestId - lastFinalizedRequestId;
  if (diff > 0) {
    const firsUnfinalizedRequest = lastFinalizedRequestId + 1;
    firstUnfinalizedRequestTimestamp = Number(
      (
        await withdrawalNFT.functions.getWithdrawalStatus(
          [firsUnfinalizedRequest],
          { blockTag: currentBlock }
        )
      ).statuses[0].timestamp
    );
  }

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
  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );
  const now = blockEvent.block.timestamp;

  if (lastBigUnfinalizedQueueAlertTimestamp < lastFinalizedBatchTimestamp) {
    const [result] = await withdrawalNFT.functions.unfinalizedStETH({
      blockTag: blockEvent.blockNumber,
    });
    const unfinalizedStETH = new BigNumber(String(result)).div(ETH_DECIMALS);
    if (unfinalizedStETH.gte(BIG_UNFINALIZED_QUEUE_THRESHOLD)) {
      // if alert hasn't been sent after last finalized batch
      // and unfinalized queue is more than `BIG_UNFINALIZED_QUEUE_THRESHOLD` StETH
      findings.push(
        Finding.fromObject({
          name: `⚠️ Withdrawals: unfinalized queue is more than ${BIG_UNFINALIZED_QUEUE_THRESHOLD} stETH`,
          description: `Unfinalized queue is ${unfinalizedStETH.toFixed(
            0
          )} stETH`,
          alertId: "WITHDRAWALS-BIG-UNFINALIZED-QUEUE",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      lastBigUnfinalizedQueueAlertTimestamp = now;
    }
  }

  if (!isBunkerMode) {
    if (
      now - LONG_UNFINALIZED_QUEUE_THRESHOLD >
      firstUnfinalizedRequestTimestamp
    ) {
      if (
        now - lastLongUnfinalizedQueueAlertTimestamp >
        LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY
      ) {
        // if we are in turbo mode and unfinalized queue is not finalized for 5 days
        // and alert hasn't been sent for 1 day
        findings.push(
          Finding.fromObject({
            name: "⚠️ Withdrawals: unfinalized queue wait time is too long",
            description: `Unfinalized queue wait time is ${formatDelay(
              now - firstUnfinalizedRequestTimestamp
            )}`,
            alertId: "WITHDRAWALS-LONG-UNFINALIZED-QUEUE",
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          })
        );
        lastLongUnfinalizedQueueAlertTimestamp = now;
      }
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleBunkerStatus(txEvent, findings),
    handleLastTokenRebase(txEvent),
    handleWithdrawalBatchFinalized(txEvent),
    handleWithdrawalRequest(txEvent, findings),
  ]);

  handleEventsOfNotice(txEvent, findings, WITHDRAWALS_EVENTS_OF_NOTICE);

  return findings;
}

async function handleWithdrawalBatchFinalized(txEvent: TransactionEvent) {
  const [withdrawalEvent] = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWAL_BATCH_FINALIZED,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  if (!withdrawalEvent) return;
  lastFinalizedRequestId = Number(withdrawalEvent.args.to);
  lastFinalizedBatchTimestamp = Number(withdrawalEvent.args.timestamp);
  firstUnfinalizedRequestTimestamp = 0;
}

async function handleLastTokenRebase(txEvent: TransactionEvent) {
  const [rebaseEvent] = txEvent.filterLog(LIDO_TOKEN_REBASED, LIDO_ADDRESS);
  if (!rebaseEvent) return;
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
  if (!withdrawalEvents) return;
  if (
    firstUnfinalizedRequestTimestamp == 0 &&
    txEvent.timestamp > lastFinalizedBatchTimestamp
  ) {
    firstUnfinalizedRequestTimestamp = txEvent.timestamp;
  }
  const perRequestorAmounts = new Map<string, BigNumber>();
  for (const event of withdrawalEvents) {
    perRequestorAmounts.set(
      event.args.requestor,
      (perRequestorAmounts.get(event.args.requestor) || new BigNumber(0)).plus(
        new BigNumber(String(event.args.amountOfStETH)).div(ETH_DECIMALS)
      )
    );
  }
  for (const [requestor, amounts] of perRequestorAmounts.entries()) {
    if (amounts.gte(BIG_WITHDRAWAL_REQUEST_THRESHOLD)) {
      findings.push(
        Finding.fromObject({
          name: `ℹ️ Withdrawals: received withdrawal request in one batch greater than ${BIG_WITHDRAWAL_REQUEST_THRESHOLD} stETH`,
          description: `Requestor: ${requestor}\nAmount: ${amounts.toFixed(
            0
          )} stETH`,
          alertId: "WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-BATCH",
          severity: FindingSeverity.Info,
          type: FindingType.Info,
        })
      );
    }
    amountOfRequestedStETHSinceLastTokenRebase =
      amountOfRequestedStETHSinceLastTokenRebase.plus(amounts);
  }
  if (
    amountOfRequestedStETHSinceLastTokenRebase.gte(
      BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD
    )
  ) {
    if (lastBigRequestAfterRebaseAlertTimestamp < lastTokenRebaseTimestamp) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than ${BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD} stETH`,
          description: `Amount: ${amountOfRequestedStETHSinceLastTokenRebase.toFixed(
            0
          )} stETH`,
          alertId: "WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-AFTER-REBASE",
          severity: FindingSeverity.High,
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
    bunkerModeEnabledSinceTimestamp = bunkerEnabled.args._sinceTimestamp;
    findings.push(
      Finding.fromObject({
        name: "🚨 Withdrawals: BUNKER MODE ON! 🚨",
        description: `Started from ${new Date(
          String(bunkerModeEnabledSinceTimestamp)
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
      txEvent.block.timestamp - Number(bunkerModeEnabledSinceTimestamp)
    );
    findings.push(
      Finding.fromObject({
        name: "✅ Withdrawals: BUNKER MODE OFF! ✅",
        description: `Bunker lasted ${delay}`,
        alertId: "WITHDRAWALS-BUNKER-DISABLED",
        severity: FindingSeverity.High,
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
