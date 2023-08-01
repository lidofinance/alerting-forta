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
  etherscanAddress,
  etherscanNft,
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";
import BigNumber from "bignumber.js";
import { BN_ZERO, ETH_DECIMALS, ONE_HOUR } from "../../common/constants";

interface WithdrawalRequest {
  id: number;
  amount: BigNumber | undefined;
  claimed: boolean;
  timestamp: string;
}

// re-fetched from history on startup
let lastFinalizedRequestId = 0;
let lastFinalizedTimestamp = 0;
let firstUnfinalizedRequestTimestamp = 0;

let lastBigUnfinalizedQueueAlertTimestamp = 0;
let lastLongUnfinalizedQueueAlertTimestamp = 0;

let isBunkerMode = false;
let bunkerModeEnabledSinceTimestamp = 0;

let lastTokenRebaseTimestamp = 0;
let amountOfRequestedStETHSinceLastTokenRebase = BN_ZERO;
let lastBigRequestAfterRebaseAlertTimestamp = 0;

let lastQueueOnParStakeLimitAlertTimestamp = 0;

let finalizedWithdrawalRequests = new Map<number, WithdrawalRequest>();

let lastUnclaimedRequestsAlertTimestamp = 0;

let lastUnclaimedMoreThanBalanceAlertTimestamp = 0;

let claimedAmountMoreThanRequestedAlertsCount = 0;
let lastClaimedAmountMoreThanRequestedAlertTimestamp = 0;

export const name = "Withdrawals";

const {
  LIDO_STETH_ADDRESS,
  LIDO_TOKEN_REBASED,
  WITHDRAWALS_BUNKER_MODE_ENABLED,
  WITHDRAWALS_BUNKER_MODE_DISABLED,
  WITHDRAWAL_QUEUE_ADDRESS,
  WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED,
  WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED,
  WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED,
  WITHDRAWALS_EVENTS_OF_NOTICE,
  BIG_WITHDRAWAL_REQUEST_THRESHOLD,
  BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD,
  BIG_UNFINALIZED_QUEUE_THRESHOLD,
  BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY,
  LONG_UNFINALIZED_QUEUE_THRESHOLD,
  LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY,
  QUEUE_ON_PAR_STAKE_LIMIT_RATE_THRESHOLD,
  QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY,
  UNCLAIMED_REQUESTS_TIME_WINDOW,
  UNCLAIMED_REQUESTS_SIZE_RATE_THRESHOLD,
  UNCLAIMED_REQUESTS_SIZE_RATE_TRIGGER_EVERY,
  UNCLAIMED_REQUESTS_MORE_THAN_BALANCE_TRIGGER_EVERY,
  CLAIMED_AMOUNT_MORE_THAN_REQUESTED_MAX_ALERTS_PER_HOUR,
  BLOCK_CHECK_INTERVAL,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge,
);

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider,
  );
  [isBunkerMode] = await withdrawalNFT.functions.isBunkerModeActive({
    blockTag: currentBlock,
  });
  if (isBunkerMode) {
    bunkerModeEnabledSinceTimestamp = Number(
      await withdrawalNFT.functions.bunkerModeSinceTimestamp({
        blockTag: currentBlock,
      }),
    );
  }
  const lastRequestId = Number(
    (
      await withdrawalNFT.functions.getLastRequestId({
        blockTag: currentBlock,
      })
    )[0],
  );
  if (lastRequestId != 0) {
    lastFinalizedRequestId = Number(
      (
        await withdrawalNFT.functions.getLastFinalizedRequestId({
          blockTag: currentBlock,
        })
      )[0],
    );
    if (lastFinalizedRequestId != 0) {
      lastFinalizedTimestamp = Number(
        (
          await withdrawalNFT.functions.getWithdrawalStatus(
            [lastFinalizedRequestId],
            { blockTag: currentBlock },
          )
        ).statuses[0].timestamp,
      );
    }
    const diff = lastRequestId - lastFinalizedRequestId;
    const requestsRange = Array.from(
      {
        length: diff > 0 ? lastFinalizedRequestId + 1 : lastFinalizedRequestId,
      },
      (_, i) => i + 1, // requests start from 1, not 0
    );
    let requestsStatuses = [];
    const requestsCount = requestsRange.length;
    while (requestsRange.length > 0) {
      const chunk = requestsRange.splice(0, 50);
      requestsStatuses.push(
        ...(
          await withdrawalNFT.functions.getWithdrawalStatus(chunk, {
            blockTag: currentBlock,
          })
        ).statuses,
      );
    }
    for (const [index, reqStatus] of requestsStatuses.entries()) {
      const reqId = index + 1;
      if (reqStatus.isFinalized == true) {
        finalizedWithdrawalRequests.set(reqId, {
          id: reqId,
          amount: new BigNumber(String(reqStatus.amountOfStETH)),
          claimed: reqStatus.isClaimed,
          timestamp: String(reqStatus.timestamp),
        });
      }
    }
    if (diff > 0) {
      firstUnfinalizedRequestTimestamp =
        requestsStatuses[requestsCount - 1].timestamp;
    }
  }
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (blockEvent.block.number % BLOCK_CHECK_INTERVAL == 0) {
    await Promise.all([
      handleQueueOnParWithStakeLimit(blockEvent, findings),
      handleUnfinalizedRequestNumber(blockEvent, findings),
      handleUnclaimedRequests(blockEvent, findings),
    ]);
  }

  return findings;
}

async function handleQueueOnParWithStakeLimit(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const now = blockEvent.block.timestamp;
  if (
    now - lastQueueOnParStakeLimitAlertTimestamp <=
    QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY
  )
    return;
  const lidoContract = new ethers.Contract(
    LIDO_STETH_ADDRESS,
    LIDO_ABI,
    ethersProvider,
  );
  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider,
  );
  const stakeLimitFullInfo = await lidoContract.functions.getStakeLimitFullInfo(
    {
      blockTag: blockEvent.blockNumber,
    },
  );
  const [unfinalizedStETH] = await withdrawalNFT.functions.unfinalizedStETH({
    blockTag: blockEvent.blockNumber,
  });
  if (stakeLimitFullInfo.isStakingPaused || unfinalizedStETH == 0) return;
  const drainedStakeLimit = new BigNumber(
    String(stakeLimitFullInfo.maxStakeLimit),
  ).minus(new BigNumber(String(stakeLimitFullInfo.currentStakeLimit)));
  const drainedStakeLimitRate = drainedStakeLimit.div(
    new BigNumber(String(stakeLimitFullInfo.maxStakeLimit)),
  );
  const thresholdStakeLimit = new BigNumber(
    String(stakeLimitFullInfo.maxStakeLimit),
  ).times(QUEUE_ON_PAR_STAKE_LIMIT_RATE_THRESHOLD);
  if (
    drainedStakeLimit.gte(thresholdStakeLimit) &&
    unfinalizedStETH.gte(thresholdStakeLimit)
  ) {
    findings.push(
      Finding.fromObject({
        name: `⚠️ Withdrawals: ${drainedStakeLimitRate.times(
          100,
        )}% of stake limit is drained and unfinalized queue is on par with drained stake limit`,
        description: `Unfinalized queue: ${new BigNumber(
          String(unfinalizedStETH),
        )
          .div(ETH_DECIMALS)
          .toFixed(2)} stETH\nDrained stake limit: ${drainedStakeLimit
          .div(ETH_DECIMALS)
          .toFixed(2)} stETH`,
        alertId: "WITHDRAWALS-UNFINALIZED-QUEUE-AND-STAKE-LIMIT",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      }),
    );
    lastQueueOnParStakeLimitAlertTimestamp = now;
  }
}

async function handleUnfinalizedRequestNumber(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider,
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
              2,
            )} stETH`,
            alertId: "WITHDRAWALS-BIG-UNFINALIZED-QUEUE",
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          }),
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
              now - firstUnfinalizedRequestTimestamp,
            )}`,
            alertId: "WITHDRAWALS-LONG-UNFINALIZED-QUEUE",
            severity: FindingSeverity.Medium,
            type: FindingType.Info,
          }),
        );
        lastLongUnfinalizedQueueAlertTimestamp = now;
      }
    }
  }
}

async function handleUnclaimedRequests(
  blockEvent: BlockEvent,
  findings: Finding[],
) {
  const now = blockEvent.block.timestamp;

  const withdrawalNFT = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider,
  );

  const unclaimedReqIds: number[] = [];
  const outdatedClaimedReqIds: number[] = [];
  let unclaimedStETH = BN_ZERO;
  let claimedStETH = BN_ZERO;
  finalizedWithdrawalRequests.forEach((req, id) => {
    if (!req.claimed) {
      unclaimedReqIds.push(id);
    }
  });
  if (unclaimedReqIds.length == 0) return;
  const unclaimedRequestsStatuses = (
    await withdrawalNFT.functions.getWithdrawalStatus(unclaimedReqIds, {
      blockTag: blockEvent.blockNumber,
    })
  ).statuses;
  for (const [index, reqStatus] of unclaimedRequestsStatuses.entries()) {
    const reqId = unclaimedReqIds[index];
    const curr = finalizedWithdrawalRequests.get(reqId) as WithdrawalRequest;
    finalizedWithdrawalRequests.set(reqId, {
      ...curr,
      amount: new BigNumber(String(reqStatus.amountOfStETH)),
      claimed: reqStatus.isClaimed,
    });
  }
  finalizedWithdrawalRequests.forEach((req, id) => {
    const isOutdated =
      now - Number(req.timestamp) > UNCLAIMED_REQUESTS_TIME_WINDOW;
    if (isOutdated) {
      if (req.claimed) {
        outdatedClaimedReqIds.push(id);
      }
    }
    if (!isOutdated && req.claimed) {
      claimedStETH = claimedStETH.plus(req.amount as BigNumber);
    }
    if (!req.claimed) {
      unclaimedStETH = unclaimedStETH.plus(req.amount as BigNumber);
    }
  });
  outdatedClaimedReqIds.forEach((id) => {
    finalizedWithdrawalRequests.delete(id);
  });
  const totalFinalizedSize = claimedStETH.plus(unclaimedStETH);
  const unclaimedSizeRate = unclaimedStETH.div(totalFinalizedSize);
  if (
    now - lastUnclaimedRequestsAlertTimestamp >
    UNCLAIMED_REQUESTS_SIZE_RATE_TRIGGER_EVERY
  ) {
    if (unclaimedSizeRate.gte(UNCLAIMED_REQUESTS_SIZE_RATE_THRESHOLD)) {
      findings.push(
        Finding.fromObject({
          name: `🤔 Withdrawals: ${unclaimedSizeRate
            .times(100)
            .toFixed(2)}% of finalized requests are unclaimed`,
          description: `Unclaimed (for all time): ${unclaimedStETH
            .div(ETH_DECIMALS)
            .toFixed(2)} stETH\nClaimed (for 2 weeks): ${claimedStETH
            .div(ETH_DECIMALS)
            .toFixed(2)} stETH\nTotal finalized: ${totalFinalizedSize
            .div(ETH_DECIMALS)
            .toFixed(2)} stETH`,
          alertId: "WITHDRAWALS-UNCLAIMED-REQUESTS",
          severity: FindingSeverity.Info,
          type: FindingType.Suspicious,
        }),
      );
      lastUnclaimedRequestsAlertTimestamp = now;
    }
  }
  if (
    now - lastUnclaimedMoreThanBalanceAlertTimestamp >
    UNCLAIMED_REQUESTS_MORE_THAN_BALANCE_TRIGGER_EVERY
  ) {
    const withdrawalQueueBalance = new BigNumber(
      String(
        await ethersProvider.getBalance(
          WITHDRAWAL_QUEUE_ADDRESS,
          blockEvent.blockNumber,
        ),
      ),
    );
    if (unclaimedStETH.gt(withdrawalQueueBalance)) {
      findings.push(
        Finding.fromObject({
          name: `🤔 Withdrawals: unclaimed requests size is more than withdrawal queue balance`,
          description: `Unclaimed: ${unclaimedStETH
            .div(ETH_DECIMALS)
            .toFixed(
              2,
            )} stETH\nWithdrawal queue balance: ${withdrawalQueueBalance
            .div(ETH_DECIMALS)
            .toFixed(2)} ETH\nDifference: ${unclaimedStETH.minus(
            withdrawalQueueBalance,
          )} wei`,
          alertId: "WITHDRAWALS-UNCLAIMED-REQUESTS-MORE-THAN-BALANCE",
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        }),
      );
      lastUnclaimedMoreThanBalanceAlertTimestamp = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleBunkerStatus(txEvent, findings),
    handleLastTokenRebase(txEvent),
    handleWithdrawalFinalized(txEvent),
    handleWithdrawalRequest(txEvent, findings),
    handleWithdrawalClaimed(txEvent, findings),
  ]);

  handleEventsOfNotice(txEvent, findings, WITHDRAWALS_EVENTS_OF_NOTICE);

  return findings;
}

async function handleWithdrawalFinalized(txEvent: TransactionEvent) {
  const [withdrawalEvent] = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED,
    WITHDRAWAL_QUEUE_ADDRESS,
  );
  if (!withdrawalEvent) return;
  const finalizedIds = Array.from(
    {
      length:
        Number(withdrawalEvent.args.to) - Number(withdrawalEvent.args.from) + 1,
    },
    (_, i) => Number(withdrawalEvent.args.from) + i,
  );
  finalizedIds.forEach((reqId) => {
    if (!finalizedWithdrawalRequests.has(reqId)) {
      finalizedWithdrawalRequests.set(reqId, {
        id: reqId,
        amount: undefined, // will be set in `handleUnclaimedRequests`
        claimed: false,
        timestamp: String(withdrawalEvent.args.timestamp),
      });
    }
  });
  lastFinalizedRequestId = Number(withdrawalEvent.args.to);
  lastFinalizedTimestamp = Number(withdrawalEvent.args.timestamp);
}

async function handleWithdrawalClaimed(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  const claimedEvents = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED,
    WITHDRAWAL_QUEUE_ADDRESS,
  );
  if (!claimedEvents) return;
  const now = txEvent.block.timestamp;
  if (now - lastClaimedAmountMoreThanRequestedAlertTimestamp > ONE_HOUR) {
    claimedAmountMoreThanRequestedAlertsCount = 0;
  }
  if (
    claimedAmountMoreThanRequestedAlertsCount >=
    CLAIMED_AMOUNT_MORE_THAN_REQUESTED_MAX_ALERTS_PER_HOUR
  )
    return;
  for (const event of claimedEvents) {
    const reqId = Number(event.args.requestId);
    if (finalizedWithdrawalRequests.has(reqId)) {
      const curr = finalizedWithdrawalRequests.get(reqId) as WithdrawalRequest;
      const claimedAmount = new BigNumber(String(event.args.amountOfETH));
      if (claimedAmount.gt(curr.amount as BigNumber)) {
        findings.push(
          Finding.fromObject({
            name: `🤔 Withdrawals: claimed amount is more than requested`,
            description: `Request ID: ${etherscanNft(
              WITHDRAWAL_QUEUE_ADDRESS,
              reqId,
            )}\nClaimed: ${claimedAmount
              .div(ETH_DECIMALS)
              .toFixed(2)} ETH\nRequested: ${(curr.amount as BigNumber)
              .div(ETH_DECIMALS)
              .toFixed(2)} stETH\nDifference: ${claimedAmount.minus(
              curr.amount as BigNumber,
            )} wei\nOwner: ${etherscanAddress(
              event.args.owner,
            )}\nReceiver: ${etherscanAddress(event.args.receiver)}`,
            alertId: "WITHDRAWALS-CLAIMED-AMOUNT-MORE-THAN-REQUESTED",
            severity: FindingSeverity.Critical,
            type: FindingType.Suspicious,
          }),
        );
        claimedAmountMoreThanRequestedAlertsCount += 1;
        lastClaimedAmountMoreThanRequestedAlertTimestamp = now;
      }
      finalizedWithdrawalRequests.set(reqId, {
        ...curr,
        amount: new BigNumber(String(event.args.amountOfETH)),
        claimed: true,
      });
    }
  }
}

async function handleLastTokenRebase(txEvent: TransactionEvent) {
  const [rebaseEvent] = txEvent.filterLog(
    LIDO_TOKEN_REBASED,
    LIDO_STETH_ADDRESS,
  );
  if (!rebaseEvent) return;
  lastTokenRebaseTimestamp = txEvent.timestamp;
  amountOfRequestedStETHSinceLastTokenRebase = new BigNumber(0);
}

async function handleWithdrawalRequest(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  const requestEvents = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED,
    WITHDRAWAL_QUEUE_ADDRESS,
  );
  if (!requestEvents) return;
  if (
    firstUnfinalizedRequestTimestamp < lastFinalizedTimestamp &&
    txEvent.timestamp >= lastFinalizedTimestamp
  ) {
    firstUnfinalizedRequestTimestamp = txEvent.timestamp;
  }
  const perRequestorAmounts = new Map<string, BigNumber>();
  for (const event of requestEvents) {
    perRequestorAmounts.set(
      event.args.requestor,
      (perRequestorAmounts.get(event.args.requestor) || new BigNumber(0)).plus(
        new BigNumber(String(event.args.amountOfStETH)).div(ETH_DECIMALS),
      ),
    );
  }
  for (const [requestor, amounts] of perRequestorAmounts.entries()) {
    if (amounts.gte(BIG_WITHDRAWAL_REQUEST_THRESHOLD)) {
      findings.push(
        Finding.fromObject({
          name: `ℹ️ Huge stETH withdrawal requests batch`,
          description: `Requestor: ${etherscanAddress(
            requestor,
          )}\nAmount: ${amounts.toFixed(2)} stETH`,
          alertId: "WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-BATCH",
          severity: FindingSeverity.Info,
          type: FindingType.Info,
        }),
      );
    }
    amountOfRequestedStETHSinceLastTokenRebase =
      amountOfRequestedStETHSinceLastTokenRebase.plus(amounts);
  }
  if (
    amountOfRequestedStETHSinceLastTokenRebase.gte(
      BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD,
    )
  ) {
    if (lastBigRequestAfterRebaseAlertTimestamp < lastTokenRebaseTimestamp) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ Withdrawals: the sum of received withdrawal requests since the last rebase greater than ${BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD} stETH`,
          description: `Amount: ${amountOfRequestedStETHSinceLastTokenRebase.toFixed(
            2,
          )} stETH`,
          alertId: "WITHDRAWALS-BIG-WITHDRAWAL-REQUEST-AFTER-REBASE",
          severity: FindingSeverity.High,
          type: FindingType.Info,
        }),
      );
      lastBigRequestAfterRebaseAlertTimestamp = txEvent.timestamp;
    }
  }
}

async function handleBunkerStatus(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  const [bunkerEnabled] = txEvent.filterLog(
    WITHDRAWALS_BUNKER_MODE_ENABLED,
    WITHDRAWAL_QUEUE_ADDRESS,
  );
  if (bunkerEnabled) {
    isBunkerMode = true;
    bunkerModeEnabledSinceTimestamp = bunkerEnabled.args._sinceTimestamp;
    findings.push(
      Finding.fromObject({
        name: "🚨 Withdrawals: BUNKER MODE ON! 🚨",
        description: `Started from ${new Date(
          String(bunkerModeEnabledSinceTimestamp),
        ).toUTCString()}`,
        alertId: "WITHDRAWALS-BUNKER-ENABLED",
        severity: FindingSeverity.Critical,
        type: FindingType.Degraded,
      }),
    );
    return;
  }
  const [bunkerDisabled] = txEvent.filterLog(
    WITHDRAWALS_BUNKER_MODE_DISABLED,
    WITHDRAWAL_QUEUE_ADDRESS,
  );
  if (bunkerDisabled) {
    isBunkerMode = false;
    const delay = formatDelay(
      txEvent.block.timestamp - Number(bunkerModeEnabledSinceTimestamp),
    );
    findings.push(
      Finding.fromObject({
        name: "✅ Withdrawals: BUNKER MODE OFF! ✅",
        description: `Bunker lasted ${delay}`,
        alertId: "WITHDRAWALS-BUNKER-DISABLED",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      }),
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
