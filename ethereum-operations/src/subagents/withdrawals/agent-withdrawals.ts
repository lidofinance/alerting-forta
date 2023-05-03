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
import LIDO_ABI from "../../abi/Lido.json";

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
let lastFinalizedTimestamp = 0;
let firstUnfinalizedRequestTimestamp = 0;

let lastBigUnfinalizedQueueAlertTimestamp = 0;
let lastLongUnfinalizedQueueAlertTimestamp = 0;

let isBunkerMode = false;
let bunkerModeEnabledSinceTimestamp = 0;

let lastTokenRebaseTimestamp = 0;
let amountOfRequestedStETHSinceLastTokenRebase = new BigNumber(0);
let lastBigRequestAfterRebaseAlertTimestamp = 0;

let lastQueueOnParStakeLimitAlertTimestamp = 0;

let claimedRequests = new Set<number>();
let claimedSize = new BigNumber(0);
let unclaimedRequests = new Set<number>();
let unclaimedSize = new BigNumber(0);
let lastUnclaimedRequestsAlertTimestamp = 0;

export const name = "Withdrawals";

const {
  LIDO_ADDRESS,
  LIDO_TOKEN_REBASED,
  WITHDRAWALS_BUNKER_MODE_ENABLED,
  WITHDRAWALS_BUNKER_MODE_DISABLED,
  WITHDRAWAL_QUEUE_ADDRESS,
  WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED,
  WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED,
  WITHDRAWALS_EVENTS_OF_NOTICE,
  BIG_WITHDRAWAL_REQUEST_THRESHOLD,
  BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD,
  BIG_UNFINALIZED_QUEUE_THRESHOLD,
  BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY,
  LONG_UNFINALIZED_QUEUE_THRESHOLD,
  LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY,
  QUEUE_ON_PAR_STAKE_LIMIT_ABS_DIFF_THRESHOLD,
  QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY,
  UNCLAIMED_REQUESTS_SIZE_RATE_THRESHOLD,
  UNCLAIMED_REQUESTS_SIZE_RATE_TRIGGER_EVERY,
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
  lastFinalizedTimestamp = Number(
    (
      await withdrawalNFT.functions.getWithdrawalStatus(
        [lastFinalizedRequestId],
        { blockTag: currentBlock }
      )
    ).statuses[0].timestamp
  );
  const diff = lastRequestId - lastFinalizedRequestId;
  const requestsRange = Array.from(
    { length: diff > 0 ? lastFinalizedRequestId + 1 : lastFinalizedRequestId },
    (_, i) => i + 1 // requests start from 1, not 0
  );
  const requestsStatuses = (
    await withdrawalNFT.functions.getWithdrawalStatus(requestsRange, {
      blockTag: currentBlock,
    })
  ).statuses;
  for (const [index, reqStatus] of requestsStatuses.entries()) {
    const reqId = index + 1;
    if (reqStatus.isFinalized == true && reqStatus.isClaimed == true) {
      claimedRequests.add(reqId);
      claimedSize = claimedSize.plus(
        new BigNumber(String(reqStatus.amountOfStETH))
      );
    } else if (reqStatus.isFinalized == true && reqStatus.isClaimed == false) {
      unclaimedRequests.add(reqId);
      unclaimedSize = unclaimedSize.plus(
        new BigNumber(String(reqStatus.amountOfStETH))
      );
    }
  }
  if (diff > 0) {
    firstUnfinalizedRequestTimestamp =
      requestsStatuses[requestsRange.length - 1].timestamp;
  }

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleQueueOnParWithStakeLimit(blockEvent, findings),
    handleUnfinalizedRequestNumber(blockEvent, findings),
    handleUnclaimedRequests(blockEvent, findings),
  ]);

  return findings;
}

async function handleQueueOnParWithStakeLimit(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (
    now - lastQueueOnParStakeLimitAlertTimestamp <=
    QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY
  )
    return;
  const lidoContract = new ethers.Contract(
    LIDO_ADDRESS,
    LIDO_ABI,
    ethersProvider
  );
  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );
  const stakeLimitFullInfo = await lidoContract.functions.getStakeLimitFullInfo(
    {
      blockTag: blockEvent.blockNumber,
    }
  );
  const [unfinalizedStETH] = await withdrawalNFT.functions.unfinalizedStETH({
    blockTag: blockEvent.blockNumber,
  });
  if (stakeLimitFullInfo.isStakingPaused || unfinalizedStETH == 0) return;
  const drainedLimit = new BigNumber(
    String(stakeLimitFullInfo.maxStakeLimit)
  ).minus(new BigNumber(String(stakeLimitFullInfo.currentStakeLimit)));
  const absDiff = drainedLimit
    .minus(new BigNumber(String(unfinalizedStETH)))
    .abs();
  if (
    !drainedLimit.eq(0) &&
    absDiff.lte(QUEUE_ON_PAR_STAKE_LIMIT_ABS_DIFF_THRESHOLD)
  ) {
    findings.push(
      Finding.fromObject({
        name: `⚠️ Withdrawals: unfinalized queue is on par with stake limit`,
        description: `Unfinalized queue: ${new BigNumber(
          String(unfinalizedStETH)
        )
          .div(ETH_DECIMALS)
          .toFixed(3)} stETH\nDrained stake limit: ${drainedLimit
          .div(ETH_DECIMALS)
          .toFixed(3)} stETH\nAbsolute diff: ${absDiff
          .div(ETH_DECIMALS)
          .toFixed(3)} stETH`,
        alertId: "WITHDRAWALS-BIG-UNFINALIZED-QUEUE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
    lastQueueOnParStakeLimitAlertTimestamp = now;
  }
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

  let unfinalizedStETH = new BigNumber(0);

  if (now >= lastFinalizedTimestamp) {
    const [result] = await withdrawalNFT.functions.unfinalizedStETH({
      blockTag: blockEvent.blockNumber,
    });
    unfinalizedStETH = new BigNumber(String(result)).div(ETH_DECIMALS);
    if (
      now - lastBigUnfinalizedQueueAlertTimestamp >
      BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY
    ) {
      if (unfinalizedStETH.gte(BIG_UNFINALIZED_QUEUE_THRESHOLD)) {
        // if alert hasn't been sent after last finalized batch
        // and unfinalized queue is more than `BIG_UNFINALIZED_QUEUE_THRESHOLD` StETH
        findings.push(
          Finding.fromObject({
            name: `⚠️ Withdrawals: unfinalized queue is more than ${BIG_UNFINALIZED_QUEUE_THRESHOLD} stETH`,
            description: `Unfinalized queue is ${unfinalizedStETH.toFixed(
              3
            )} stETH`,
            alertId: "WITHDRAWALS-BIG-UNFINALIZED-QUEUE",
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          })
        );
        lastBigUnfinalizedQueueAlertTimestamp = now;
      }
    }
  }

  if (!isBunkerMode && unfinalizedStETH.gt(0)) {
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

async function handleUnclaimedRequests(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (
    now - lastUnclaimedRequestsAlertTimestamp <=
    UNCLAIMED_REQUESTS_SIZE_RATE_TRIGGER_EVERY
  ) {
    return;
  }

  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );

  const unclaimedRequestsStatuses = (
    await withdrawalNFT.functions.getWithdrawalStatus(
      Array.from(unclaimedRequests.values()),
      { blockTag: blockEvent.blockNumber }
    )
  ).statuses;
  for (const [index, reqStatus] of unclaimedRequestsStatuses.entries()) {
    const reqId = Array.from(unclaimedRequests)[index];
    if (reqStatus.isFinalized == true && reqStatus.isClaimed == true) {
      if (!claimedRequests.has(reqId)) {
        claimedRequests.add(reqId);
        claimedSize = claimedSize.plus(
          new BigNumber(String(reqStatus.amountOfStETH))
        );
      }
      if (unclaimedRequests.has(reqId)) {
        unclaimedRequests.delete(reqId);
        unclaimedSize = unclaimedSize.minus(
          new BigNumber(String(reqStatus.amountOfStETH))
        );
      }
    } else if (reqStatus.isFinalized == true && reqStatus.isClaimed == false) {
      if (!unclaimedRequests.has(reqId)) {
        unclaimedRequests.add(reqId);
        unclaimedSize = unclaimedSize.plus(
          new BigNumber(String(reqStatus.amountOfStETH))
        );
      }
    }
  }

  const totalFinalizedSize = claimedSize.plus(unclaimedSize);
  const unclaimedSizeRate = unclaimedSize.div(totalFinalizedSize);
  if (unclaimedSizeRate.gte(UNCLAIMED_REQUESTS_SIZE_RATE_THRESHOLD)) {
    findings.push(
      Finding.fromObject({
        name: `🤔 Withdrawals: ${unclaimedSizeRate
          .times(100)
          .toFixed(2)}% of finalized requests are unclaimed`,
        description: `Unclaimed: ${unclaimedSize
          .div(ETH_DECIMALS)
          .toFixed(3)} stETH\nTotal finalized: ${totalFinalizedSize
          .div(ETH_DECIMALS)
          .toFixed(3)} stETH`,
        alertId: "WITHDRAWALS-UNCLAIMED-REQUESTS",
        severity: FindingSeverity.Info,
        type: FindingType.Suspicious,
      })
    );
    lastUnclaimedRequestsAlertTimestamp = now;
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleBunkerStatus(txEvent, findings),
    handleLastTokenRebase(txEvent),
    handleWithdrawalFinalized(txEvent),
    handleWithdrawalRequest(txEvent, findings),
  ]);

  handleEventsOfNotice(txEvent, findings, WITHDRAWALS_EVENTS_OF_NOTICE);

  return findings;
}

async function handleWithdrawalFinalized(txEvent: TransactionEvent) {
  const [withdrawalEvent] = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  if (!withdrawalEvent) return;
  lastFinalizedRequestId = Number(withdrawalEvent.args.to);
  lastFinalizedTimestamp = Number(withdrawalEvent.args.timestamp);
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
    firstUnfinalizedRequestTimestamp < lastFinalizedTimestamp &&
    txEvent.timestamp >= lastFinalizedTimestamp
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
            3
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
            3
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
