import BigNumber from "bignumber.js";

import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import LIDO_ABI from "../../abi/Lido.json";
import STAKING_ROUTER_ABI from "../../abi/StakingRouter.json";
import BURNER_ABI from "../../abi/Burner.json";
import WITHDRAWAL_QUEUE_ABI from "../../abi/WithdrawalQueueERC721.json";

import { formatDelay, formatBN2Str } from "./utils";
import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";
import {
  BN_ZERO,
  ETH_DECIMALS,
  ONE_DAY,
  ONE_YEAR,
  SECONDS_PER_SLOT,
} from "../../common/constants";
import { toNumber } from "lodash";
const {
  LIDO_STETH_ADDRESS,
  ACCOUNTING_ORACLE_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  WITHDRAWAL_QUEUE_ADDRESS,
  EL_REWARDS_VAULT_ADDRESS,
  WITHDRAWALS_VAULT_ADDRESS,
  BURNER_ADDRESS,
  NODE_OPERATOR_REGISTRY_MODULE_ID,
  ACCOUNTING_ORACLE_EXTRA_DATA_SUBMITTED_EVENT,
  LIDO_ETHDESTRIBUTED_EVENT,
  LIDO_ELREWARDSRECEIVED_EVENT,
  LIDO_WITHDRAWALSRECEIVED_EVENT,
  LIDO_VALIDATORS_UPDATED_EVENT,
  LIDO_SHARES_BURNT_EVENT,
  LIDO_TOKEN_REBASED_EVENT,
  WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
  LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_HIGH,
  LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_MEDIUM,
  LIDO_REPORT_LIMIT_REACHED_APR_THRESHOLD,
  LIDO_REPORT_HIGH_APR_THRESHOLD,
  LIDO_REPORT_LOW_APR_THRESHOLD,
  OVERFILL_THRESHOLD_PERCENT,
  OVERFILL_ALERT_TRIGGER_EVERY,
  OVERFILL_CHECK_INTERVAL,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge,
);

export const name = "LidoReport";

// re-fetched from history on startup
let lastCLrewards = BN_ZERO;
let lastELrewards = BN_ZERO;
let lastTotalShares = BN_ZERO;
let lastTotalEther = BN_ZERO;
let lastAllExited = 0;
let lastAllStuck = 0;
let lastAllRefunded = 0;

let lastRebaseEventTimestamp = 0;

let lastELOverfillAlertTimestamp = 0;
let lastWithdrawalsVaultOverfillAlertTimestamp = 0;
let lastBurnerOverfillAlertTimestamp = 0;

export async function initialize(
  currentBlock: number,
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const { allExited, allStuck, allRefunded } = await getSummaryDigest(
    currentBlock,
  );
  lastAllExited = allExited;
  lastAllStuck = allStuck;
  lastAllRefunded = allRefunded;

  const lido = new ethers.Contract(
    LIDO_STETH_ADDRESS,
    LIDO_ABI,
    ethersProvider,
  );
  const block48HoursAgo =
    currentBlock - Math.ceil((2 * ONE_DAY) / SECONDS_PER_SLOT);
  const ethDistributedEvents = await lido.queryFilter(
    lido.filters.ETHDistributed(),
    block48HoursAgo,
    currentBlock - 1,
  );
  if (ethDistributedEvents.length > 0) {
    const lastEvent = ethDistributedEvents[ethDistributedEvents.length - 1];

    const [withdrawalsReceivedEvent] = await lido.queryFilter(
      lido.filters.WithdrawalsReceived(),
      lastEvent.blockNumber,
      lastEvent.blockNumber,
    );
    const [elRewardsReceivedEvent] = await lido.queryFilter(
      lido.filters.ELRewardsReceived(),
      lastEvent.blockNumber,
      lastEvent.blockNumber,
    );
    const [tokenRebasedEvent] = await lido.queryFilter(
      lido.filters.TokenRebased(),
      lastEvent.blockNumber,
      lastEvent.blockNumber,
    );
    if (withdrawalsReceivedEvent) {
      const { preCLBalance, postCLBalance } = ethDistributedEvents[
        ethDistributedEvents.length - 1
      ].args as any;

      lastCLrewards = new BigNumber(String(postCLBalance))
        .minus(String(preCLBalance))
        .plus(
          String(new BigNumber(String(withdrawalsReceivedEvent.args?.amount))),
        )
        .div(ETH_DECIMALS);
    }
    if (elRewardsReceivedEvent) {
      lastELrewards = new BigNumber(
        String(elRewardsReceivedEvent.args?.amount),
      ).div(ETH_DECIMALS);
    }
    if (tokenRebasedEvent) {
      lastTotalShares = new BigNumber(
        String(tokenRebasedEvent.args?.postTotalShares),
      );
      lastTotalEther = new BigNumber(
        String(tokenRebasedEvent.args?.postTotalEther),
      );
    }
  }
  const withdrawalsQueue = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider,
  );

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];
  const now = blockEvent.block.timestamp;

  if (
    now >= lastRebaseEventTimestamp &&
    blockEvent.blockNumber % OVERFILL_CHECK_INTERVAL == 0
  ) {
    const lido = new ethers.Contract(
      LIDO_STETH_ADDRESS,
      LIDO_ABI,
      ethersProvider,
    );

    const tvl = new BigNumber(
      String(
        await lido.functions.totalSupply({ blockTag: blockEvent.blockNumber }),
      ),
    );
    const totalShares = new BigNumber(
      String(
        await lido.functions.getTotalShares({
          blockTag: blockEvent.blockNumber,
        }),
      ),
    );

    await Promise.all([
      handleELRewardsVaultOverfill(blockEvent, findings, tvl),
      handleWithdrawalsVaultOverfill(blockEvent, findings, tvl),
      handleBurnerUnburntSharesOverfill(blockEvent, findings, totalShares),
    ]);
  }

  return findings;
}

async function handleELRewardsVaultOverfill(
  blockEvent: BlockEvent,
  findings: Finding[],
  tvl: BigNumber,
) {
  const now = blockEvent.block.timestamp;
  const balance = new BigNumber(
    String(
      await ethersProvider.getBalance(
        EL_REWARDS_VAULT_ADDRESS,
        blockEvent.blockNumber,
      ),
    ),
  );
  if (now - lastELOverfillAlertTimestamp > OVERFILL_ALERT_TRIGGER_EVERY) {
    if (balance.div(tvl).times(100).gt(OVERFILL_THRESHOLD_PERCENT)) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ ELRewardsVault overfilled: balance is more than ${OVERFILL_THRESHOLD_PERCENT}% of TVL`,
          description:
            `Balance: ${balance.div(ETH_DECIMALS).toFixed(2)} ` +
            `ETH\nTVL: ${tvl.div(ETH_DECIMALS).toFixed(2)} ETH`,
          alertId: "LIDO-EL-REWARDS-VAULT-OVERFILLED",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      );
      lastELOverfillAlertTimestamp = now;
    }
  }
}

async function handleWithdrawalsVaultOverfill(
  blockEvent: BlockEvent,
  findings: Finding[],
  tvl: BigNumber,
) {
  const now = blockEvent.block.timestamp;
  const balance = new BigNumber(
    String(
      await ethersProvider.getBalance(
        WITHDRAWALS_VAULT_ADDRESS,
        blockEvent.blockNumber,
      ),
    ),
  );
  if (
    now - lastWithdrawalsVaultOverfillAlertTimestamp >
    OVERFILL_ALERT_TRIGGER_EVERY
  ) {
    if (balance.div(tvl).times(100).gt(OVERFILL_THRESHOLD_PERCENT)) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ WithdrawalsVault overfilled: balance is more than ${OVERFILL_THRESHOLD_PERCENT}% of TVL`,
          description:
            `Balance: ${balance.div(ETH_DECIMALS).toFixed(2)} ` +
            `ETH\nTVL: ${tvl.div(ETH_DECIMALS).toFixed(2)} ETH`,
          alertId: "LIDO-WITHDRAWALS-VAULT-OVERFILLED",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      );
      lastWithdrawalsVaultOverfillAlertTimestamp = now;
    }
  }
}

async function handleBurnerUnburntSharesOverfill(
  blockEvent: BlockEvent,
  findings: Finding[],
  totalShares: BigNumber,
) {
  const now = blockEvent.block.timestamp;
  const burner = new ethers.Contract(
    BURNER_ADDRESS,
    BURNER_ABI,
    ethersProvider,
  );
  if (now - lastBurnerOverfillAlertTimestamp > OVERFILL_ALERT_TRIGGER_EVERY) {
    const { coverShares, nonCoverShares } =
      await burner.functions.getSharesRequestedToBurn({
        blockTag: blockEvent.blockNumber,
      });
    const unburntShares = new BigNumber(String(coverShares)).plus(
      new BigNumber(String(nonCoverShares)),
    );
    if (
      unburntShares.div(totalShares).times(100).gt(OVERFILL_THRESHOLD_PERCENT)
    ) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ Burner overfilled: unburnt shares are more than ${OVERFILL_THRESHOLD_PERCENT}% of total shares`,
          description:
            `Unburnt: ${unburntShares.div(ETH_DECIMALS).toFixed(2)} × 1e18` +
            `\nTotal shares: ` +
            `${totalShares.div(ETH_DECIMALS).toFixed(2)} × 1e18`,
          alertId: "LIDO-BURNER-UNBURNT-OVERFILLED",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        }),
      );
      lastBurnerOverfillAlertTimestamp = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (txEvent.to === ACCOUNTING_ORACLE_ADDRESS) {
    await Promise.all([
      handleExitedStuckRefundedKeysDigest(txEvent, findings),
      handleRebaseDigest(txEvent, findings),
    ]);
  }

  return findings;
}

async function handleExitedStuckRefundedKeysDigest(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  const [extraDataSubmittedEvent] = txEvent.filterLog(
    ACCOUNTING_ORACLE_EXTRA_DATA_SUBMITTED_EVENT,
    ACCOUNTING_ORACLE_ADDRESS,
  );
  if (!extraDataSubmittedEvent) return;
  const { allExited, allStuck, allRefunded } = await getSummaryDigest(
    txEvent.blockNumber,
  );
  const newExited = allExited - lastAllExited;
  const newStuck = allStuck - lastAllStuck;
  const newRefunded = allRefunded - lastAllRefunded;
  if (newExited == 0 && newStuck == 0 && newRefunded == 0) return;
  findings.push(
    Finding.fromObject({
      name: "ℹ️ Lido Report: new exited, stuck and refunded keys digest",
      description: `New exited: ${newExited}\nNew stuck: ${newStuck}\nNew refunded: ${newRefunded}`,
      alertId: "LIDO-REPORT-EXITED-STUCK-REFUNDED-KEYS-DIGEST",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    }),
  );
  lastAllStuck = allStuck;
  lastAllRefunded = allRefunded;
  lastAllExited = allExited;
}

async function handleRebaseDigest(
  txEvent: TransactionEvent,
  findings: Finding[],
) {
  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  if (!ethDistributedEvent) return;

  let metadata: { [key: string]: string } = {};

  const lines = [
    prepareAPRLines(txEvent, findings, metadata),
    prepareRewardsLines(txEvent, findings, metadata),
    prepareValidatorsCountLines(txEvent, metadata),
    prepareWithdrawnLines(txEvent, metadata),
    await prepareRequestsFinalizationLines(txEvent, metadata),
    prepareSharesBurntLines(txEvent, metadata),
  ];

  findings.push(
    Finding.fromObject({
      name: "ℹ️ Lido Report: rebase digest",
      description: lines.filter((l) => l != undefined).join("\n\n"),
      alertId: "LIDO-REPORT-REBASE-DIGEST",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
      metadata,
    }),
  );
}

function prepareAPRLines(
  txEvent: TransactionEvent,
  findings: Finding[],
  metadata: { [key: string]: string },
): string | undefined {
  const [tokenRebasedEvent] = txEvent.filterLog(
    LIDO_TOKEN_REBASED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  lastRebaseEventTimestamp = txEvent.block.timestamp;
  let timeElapsed = new BigNumber(String(tokenRebasedEvent.args.timeElapsed));
  metadata.timeElapsed = timeElapsed.toFixed(0);
  let preTotalShares = new BigNumber(
    String(tokenRebasedEvent.args.preTotalShares),
  );
  metadata.preTotalShares = formatBN2Str(preTotalShares.div(ETH_DECIMALS));

  let preTotalEther = new BigNumber(
    String(tokenRebasedEvent.args.preTotalEther),
  );
  metadata.preTotalEther = formatBN2Str(preTotalEther.div(ETH_DECIMALS));
  let postTotalShares = new BigNumber(
    String(tokenRebasedEvent.args.postTotalShares),
  );
  metadata.postTotalShares = formatBN2Str(postTotalShares.div(ETH_DECIMALS));
  let postTotalEther = new BigNumber(
    String(tokenRebasedEvent.args.postTotalEther),
  );
  metadata.postTotalEther = formatBN2Str(postTotalEther.div(ETH_DECIMALS));

  const sharesDiff = postTotalShares.minus(lastTotalShares).div(ETH_DECIMALS);
  const sharesDiffStr =
    Number(sharesDiff) > 0
      ? `+${sharesDiff.toFixed(2)}`
      : sharesDiff.toFixed(2);
  metadata.sharesDiff =
    Number(sharesDiff) > 0
      ? `+${formatBN2Str(sharesDiff)}`
      : formatBN2Str(sharesDiff);
  lastTotalShares = postTotalShares;

  const etherDiff = postTotalEther.minus(lastTotalEther).div(ETH_DECIMALS);
  const etherDiffStr =
    Number(etherDiff) > 0 ? `+${etherDiff.toFixed(2)}` : etherDiff.toFixed(2);
  metadata.etherDiff =
    Number(etherDiff) > 0
      ? `+${formatBN2Str(etherDiff)}`
      : formatBN2Str(etherDiff);
  lastTotalEther = postTotalEther;

  const apr = calculateAPR(
    timeElapsed,
    preTotalShares,
    preTotalEther,
    postTotalShares,
    postTotalEther,
  );
  metadata.apr = apr.times(100).toFixed(2);

  let findingName: string = "";
  let findingSeverity: FindingSeverity = FindingSeverity.Info;
  let digestAprStr = `APR: ${apr.times(100).toFixed(2)}%`;
  if (apr.gte(LIDO_REPORT_LIMIT_REACHED_APR_THRESHOLD)) {
    findingName = `🚨️ Lido Report: APR is greater than ${
      LIDO_REPORT_LIMIT_REACHED_APR_THRESHOLD * 100
    }% limit`;
    digestAprStr += ` 🚨️ > ${LIDO_REPORT_LIMIT_REACHED_APR_THRESHOLD * 100}%`;
    findingSeverity = FindingSeverity.High;
  } else if (apr.gte(LIDO_REPORT_HIGH_APR_THRESHOLD)) {
    findingName = `⚠️ Lido Report: APR is greater than ${
      LIDO_REPORT_HIGH_APR_THRESHOLD * 100
    }%`;
    digestAprStr += ` ⚠️ > ${LIDO_REPORT_HIGH_APR_THRESHOLD * 100}%`;
    findingSeverity = FindingSeverity.Medium;
  } else if (apr.lte(LIDO_REPORT_LOW_APR_THRESHOLD)) {
    findingName = `🚨️️ Lido Report: APR is less than ${
      LIDO_REPORT_LOW_APR_THRESHOLD * 100
    }%`;
    digestAprStr += ` 🚨 < ${LIDO_REPORT_LOW_APR_THRESHOLD * 100}%`;
    findingSeverity = FindingSeverity.High;
  }

  const additionalDescription =
    `Total shares: ` +
    `${formatBN2Str(
      postTotalShares.div(ETH_DECIMALS),
    )} (${sharesDiffStr}) × 1e18` +
    `\nTotal pooled ether: ` +
    `${formatBN2Str(postTotalEther.div(ETH_DECIMALS))} (${etherDiffStr}) ETH` +
    `\nTime elapsed: ${formatDelay(Number(timeElapsed))}`;

  if (findingName != "") {
    findings.push(
      Finding.fromObject({
        name: findingName,
        alertId: "LIDO-UNUSUAL-REPORT-APR-STATS",
        description: `APR: ${apr
          .times(100)
          .toFixed(2)}%\n${additionalDescription}`,
        severity: findingSeverity,
        type: FindingType.Info,
      }),
    );
  }

  return `*APR stats*\n${digestAprStr}\n${additionalDescription}`;
}

function prepareRewardsLines(
  txEvent: TransactionEvent,
  findings: Finding[],
  metadata: { [key: string]: string },
): string {
  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  const [withdrawalsReceivedEvent] = txEvent.filterLog(
    LIDO_WITHDRAWALSRECEIVED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  const [elRewardsReceivedEvent] = txEvent.filterLog(
    LIDO_ELREWARDSRECEIVED_EVENT,
    LIDO_STETH_ADDRESS,
  );

  const { preCLBalance, postCLBalance } = ethDistributedEvent.args;
  const clValidatorsBalanceDiff = new BigNumber(String(postCLBalance)).minus(
    new BigNumber(String(preCLBalance)),
  );
  const withdrawalsReceived = withdrawalsReceivedEvent
    ? new BigNumber(String(withdrawalsReceivedEvent.args.amount))
    : BN_ZERO;
  const clRewards = clValidatorsBalanceDiff
    .plus(withdrawalsReceived)
    .div(ETH_DECIMALS);
  metadata.clRewards = formatBN2Str(clRewards);
  const elRewards = elRewardsReceivedEvent
    ? new BigNumber(String(elRewardsReceivedEvent.args.amount)).div(
        ETH_DECIMALS,
      )
    : BN_ZERO;
  metadata.elRewards = formatBN2Str(elRewards);
  const totalRewards = clRewards.plus(elRewards);
  metadata.totalRewards = formatBN2Str(totalRewards);

  lastCLrewards = lastCLrewards.eq(BN_ZERO) ? clRewards : lastCLrewards;
  lastELrewards = lastELrewards.eq(BN_ZERO) ? elRewards : lastELrewards;
  const lastTotalRewards = lastCLrewards.plus(lastELrewards);
  const clRewardsDiff = clRewards.minus(lastCLrewards);
  const elRewardsDiff = elRewards.minus(lastELrewards);
  const totalRewardsDiff = clRewardsDiff.plus(elRewardsDiff);
  const strCLRewardsDiff =
    Number(clRewardsDiff) > 0
      ? `+${formatBN2Str(clRewardsDiff)}`
      : formatBN2Str(clRewardsDiff);
  metadata.clRewardsDiff = strCLRewardsDiff;
  const clRewardsDiffPercent = clRewards.div(lastCLrewards).minus(1).times(100);
  metadata.clRewardsDiffPercent =
    Number(clRewardsDiffPercent) > 0
      ? `+${formatBN2Str(clRewardsDiffPercent)}`
      : formatBN2Str(clRewardsDiffPercent);

  const strELRewardsDiff =
    Number(elRewardsDiff) > 0
      ? `+${formatBN2Str(elRewardsDiff)}`
      : formatBN2Str(elRewardsDiff);
  metadata.elRewardsDiff = strELRewardsDiff;
  metadata.elRewardsDiffPercent = formatBN2Str(
    elRewards.div(lastELrewards).minus(1).times(100),
  );
  const elRewardsDiffPercent = elRewards.div(lastELrewards).minus(1).times(100);
  metadata.elRewardsDiffPercent =
    Number(elRewardsDiffPercent) > 0
      ? `+${formatBN2Str(elRewardsDiffPercent)}`
      : formatBN2Str(elRewardsDiffPercent);

  const strTotalRewardsDiff =
    Number(totalRewardsDiff) > 0
      ? `+${formatBN2Str(totalRewardsDiff)}`
      : formatBN2Str(totalRewardsDiff);
  metadata.totalRewardsDiff = strTotalRewardsDiff;
  const totalRewardsDiffPercent = totalRewards
    .div(lastTotalRewards)
    .minus(1)
    .times(100);
  metadata.totalRewardsDiffPercent =
    Number(totalRewardsDiffPercent) > 0
      ? `+${formatBN2Str(totalRewardsDiffPercent)}`
      : formatBN2Str(totalRewardsDiffPercent);

  let strCLRewards = `CL rewards: ${formatBN2Str(
    clRewards,
  )} (${strCLRewardsDiff}) ETH`;

  const strCLRewardsDiffPercent =
    Number(clRewardsDiffPercent) > 0
      ? `+${clRewardsDiffPercent.toFixed(2)}`
      : clRewardsDiffPercent.toFixed(2);
  if (
    Number(clRewardsDiffPercent) <
    -LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_MEDIUM
  ) {
    strCLRewards =
      `️CL rewards: ${formatBN2Str(clRewards)} ETH 🚨️ decreased ` +
      `by ${formatBN2Str(clRewardsDiff)} ETH (${strCLRewardsDiffPercent}%)`;
    const severity =
      Number(clRewardsDiffPercent) <
      -LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_HIGH
        ? FindingSeverity.High
        : FindingSeverity.Medium;
    findings.push(
      Finding.fromObject({
        name: "🚨 Lido Report: CL rewards decreased",
        description:
          `Rewards decreased from ${formatBN2Str(lastCLrewards)} ` +
          `ETH to ${formatBN2Str(clRewards)} ` +
          `by ${formatBN2Str(clRewardsDiff)} ETH (${strCLRewardsDiffPercent}%)`,
        alertId: "LIDO-REPORT-CL-REWARDS-DECREASED",
        severity: severity,
        type: FindingType.Degraded,
      }),
    );
  }

  lastCLrewards = clRewards;
  lastELrewards = elRewards;

  return `*Rewards*\n${strCLRewards}\nEL rewards: ${formatBN2Str(
    elRewards,
  )} (${strELRewardsDiff}) ETH\nTotal: ${formatBN2Str(
    clRewards.plus(elRewards),
  )} (${strTotalRewardsDiff}) ETH`;
}

function prepareValidatorsCountLines(
  txEvent: TransactionEvent,
  metadata: { [key: string]: string },
): string {
  const [validatorsUpdated] = txEvent.filterLog(
    LIDO_VALIDATORS_UPDATED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  const { preCLValidators, postCLValidators } = validatorsUpdated.args;
  metadata.postCLValidators = Number(postCLValidators).toLocaleString();
  metadata.clValidatorsDiff = (
    Number(postCLValidators) - Number(preCLValidators)
  ).toLocaleString();
  return `*Validators*\nCount: ${postCLValidators} (${
    Number(postCLValidators) - Number(preCLValidators)
  } newly appeared)`;
}

function prepareWithdrawnLines(
  txEvent: TransactionEvent,
  metadata: { [key: string]: string },
): string {
  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  const [elRewardsReceivedEvent] = txEvent.filterLog(
    LIDO_ELREWARDSRECEIVED_EVENT,
    LIDO_STETH_ADDRESS,
  );

  const elRewardsReceived = elRewardsReceivedEvent
    ? new BigNumber(String(elRewardsReceivedEvent.args.amount))
    : BN_ZERO;

  const { withdrawalsWithdrawn, executionLayerRewardsWithdrawn } =
    ethDistributedEvent.args;
  const wdWithdrawn = new BigNumber(String(withdrawalsWithdrawn)).div(
    ETH_DECIMALS,
  );
  metadata.wdWithdrawn = formatBN2Str(wdWithdrawn);
  const elWithdrawn = new BigNumber(String(executionLayerRewardsWithdrawn));
  metadata.elWithdrawn = formatBN2Str(elWithdrawn.div(ETH_DECIMALS));
  const elWithdrawnReceivedDiff = elRewardsReceived.minus(elWithdrawn);

  return (
    `*Withdrawn from vaults*\nWithdrawal Vault: ` +
    `${formatBN2Str(wdWithdrawn)} ETH` +
    `\nEL Vault: ${formatBN2Str(elWithdrawn.div(ETH_DECIMALS))} ETH` +
    `${
      elWithdrawnReceivedDiff.gt(0)
        ? ` ⚠️ ${formatBN2Str(
            elWithdrawnReceivedDiff.div(ETH_DECIMALS),
          )} ETH left on the vault`
        : ""
    }`
  );
}

async function prepareRequestsFinalizationLines(
  txEvent: TransactionEvent,
  metadata: { [key: string]: string },
): Promise<string> {
  const lido = new ethers.Contract(
    LIDO_STETH_ADDRESS,
    LIDO_ABI,
    ethersProvider,
  );
  const withdrawalsQueue = new ethers.Contract(
    WITHDRAWAL_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider,
  );
  const [withdrawalsFinalizedEvent] = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
    WITHDRAWAL_QUEUE_ADDRESS,
  );
  let description = "No finalized requests";
  const nonFinalizedRequestsCount = new BigNumber(
    String(
      await withdrawalsQueue.functions.unfinalizedRequestNumber({
        blockTag: txEvent.blockNumber,
      }),
    ),
  ).toNumber();
  metadata.nonFinalizedRequestsCount = nonFinalizedRequestsCount.toString();
  const [nonFinalizedRequestsAmountRaw] =
    await withdrawalsQueue.functions.unfinalizedStETH({
      blockTag: txEvent.blockNumber,
    });
  const nonFinalizedRequestsAmount = new BigNumber(
    String(nonFinalizedRequestsAmountRaw),
  ).div(ETH_DECIMALS);
  metadata.nonFinalizedRequestsAmount = formatBN2Str(
    nonFinalizedRequestsAmount,
  );
  if (!withdrawalsFinalizedEvent) {
    metadata.finalizedEth = "0";
    metadata.finalizedRequestsCount = "0";
    metadata.finalizationBufferUsed = "0";
    metadata.finalizationShareRate = "0";
    return (
      `*Requests finalization*\n${description}` +
      `\nPending: ${nonFinalizedRequestsCount} ` +
      `(${formatBN2Str(nonFinalizedRequestsAmount)} stETH)`
    );
  }
  const [tokenRebasedEvent] = txEvent.filterLog(
    LIDO_TOKEN_REBASED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  const { postTotalEther, postTotalShares } = tokenRebasedEvent.args;
  const { from, to, amountOfETHLocked } = withdrawalsFinalizedEvent.args;
  const ether = new BigNumber(String(amountOfETHLocked)).div(ETH_DECIMALS);
  metadata.finalizedEth = formatBN2Str(ether);
  const requests = Number(to) - Number(from);
  metadata.finalizedRequestsCount = requests.toString();
  const shareRate = new BigNumber(String(postTotalEther)).div(
    new BigNumber(String(postTotalShares)),
  );
  metadata.finalizationShareRate = shareRate.toFixed(5);

  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_STETH_ADDRESS,
  );
  const { postBufferedEther } = ethDistributedEvent.args;
  const preBufferedEther = await lido.functions.getBufferedEther({
    blockTag: txEvent.blockNumber - 1,
  });
  const bufferDiff = new BigNumber(String(postBufferedEther)).minus(
    preBufferedEther,
  );
  const finalizationBufferUsed = bufferDiff.lt(0)
    ? formatBN2Str(bufferDiff.times(-1).div(ETH_DECIMALS))
    : "0.00";
  metadata.finalizationBufferUsed = finalizationBufferUsed;

  if (requests > 0) {
    description =
      `Finalized: ${requests} ` +
      `(${formatBN2Str(ether)} ETH)` +
      `\nPending: ${nonFinalizedRequestsCount} ` +
      `(${formatBN2Str(nonFinalizedRequestsAmount)} stETH)` +
      `\nShare rate: ${shareRate.toFixed(5)}` +
      `\nUsed buffer: ${finalizationBufferUsed} ETH`;
  }
  return `*Requests finalization*\n${description}`;
}

function prepareSharesBurntLines(
  txEvent: TransactionEvent,
  metadata: { [key: string]: string },
): string {
  const [sharesBurntEvent] = txEvent.filterLog(
    LIDO_SHARES_BURNT_EVENT,
    LIDO_STETH_ADDRESS,
  );
  if (!sharesBurntEvent) {
    return `*Shares*\nNo shares burnt`;
  }
  const sharesBurnt = sharesBurntEvent
    ? new BigNumber(String(sharesBurntEvent.args.sharesAmount)).div(
        ETH_DECIMALS,
      )
    : new BigNumber(0);
  metadata.sharesBurnt = formatBN2Str(sharesBurnt);
  return `*Shares*\nBurnt: ${formatBN2Str(sharesBurnt)} × 1e18`;
}

async function getSummaryDigest(block: number) {
  const stakingRouter = new ethers.Contract(
    STAKING_ROUTER_ADDRESS,
    STAKING_ROUTER_ABI,
    ethersProvider,
  );

  const [operators] = await stakingRouter.functions.getAllNodeOperatorDigests(
    NODE_OPERATOR_REGISTRY_MODULE_ID,
    { blockTag: block },
  );

  let allExited = 0;
  let allStuck = 0;
  let allRefunded = 0;

  operators.forEach((digest: any) => {
    allStuck += Number(digest.summary.stuckValidatorsCount);
    allRefunded += Number(digest.summary.refundedValidatorsCount);
    allExited += Number(digest.summary.totalExitedValidators);
  });

  return {
    allExited,
    allStuck,
    allRefunded,
  };
}

function calculateAPR(
  timeElapsed: BigNumber,
  preTotalShares: BigNumber,
  preTotalEther: BigNumber,
  postTotalShares: BigNumber,
  postTotalEther: BigNumber,
): BigNumber {
  const preShareRate = preTotalEther.div(preTotalShares);
  const postShareRate = postTotalEther.div(postTotalShares);

  return new BigNumber(ONE_YEAR)
    .times(postShareRate.minus(preShareRate).div(preShareRate))
    .div(timeElapsed);
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
