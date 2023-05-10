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

import { formatDelay } from "./utils";
import { RedefineMode, requireWithTier } from "../../common/utils";
import type * as Constants from "./constants";
import {
  BN_ZERO,
  ETH_DECIMALS,
  ONE_DAY,
  ONE_YEAR,
  SECONDS_PER_SLOT,
} from "../../common/constants";
const {
  LIDO_ADDRESS,
  ACCOUNTING_ORACLE_ADDRESS,
  STAKING_ROUTER_ADDRESS,
  WITHDRAWAL_QUEUE_ADDRESS,
  EL_REWARDS_VAULT_ADDRESS,
  WITHDRAWALS_VAULT_ADDRESS,
  BURNER_ADDRESS,
  NODE_OPERATOR_REGISTRY_MODULE_ID,
  ACCOUNTING_ORACLE_EXTRA_DATA_SUBMITTED_EVENT,
  LIDO_ETHDESTRIBUTED_EVENT,
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
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

export const name = "LidoReport";

// re-fetched from history on startup
let lastCLrewards = new BigNumber(0);
let lastAllExited = 0;
let lastAllStuck = 0;
let lastAllRefunded = 0;

let lastRebaseEventTimestamp = 0;

let lastELOverfillAlertTimestamp = 0;
let lastWithdrawalsVaultOverfillAlertTimestamp = 0;
let lastBurnerOverfillAlertTimestamp = 0;

let initFindings: Finding[] = [];

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const { allExited, allStuck, allRefunded } = await getSummaryDigest(
    currentBlock
  );
  lastAllExited = allExited;
  lastAllStuck = allStuck;
  lastAllRefunded = allRefunded;

  const lido = new ethers.Contract(LIDO_ADDRESS, LIDO_ABI, ethersProvider);
  const block48HoursAgo =
    currentBlock - Math.ceil((2 * ONE_DAY) / SECONDS_PER_SLOT);
  const ethDistributedEvents = await lido.queryFilter(
    lido.filters.ETHDistributed(),
    block48HoursAgo,
    currentBlock - 1
  );
  if (ethDistributedEvents.length > 1) {
    const { preCLBalance, postCLBalance, withdrawalsWithdrawn } =
      ethDistributedEvents[ethDistributedEvents.length - 2].args as any;
    lastCLrewards = new BigNumber(String(postCLBalance))
      .minus(String(preCLBalance))
      .plus(String(withdrawalsWithdrawn))
      .div(ETH_DECIMALS);
  }

  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  if (initFindings.length > 0) {
    findings.push(...initFindings);
    initFindings = [];
  }

  const now = blockEvent.block.timestamp;

  if (now >= lastRebaseEventTimestamp) {
    const lido = new ethers.Contract(LIDO_ADDRESS, LIDO_ABI, ethersProvider);

    const tvl = new BigNumber(
      String(
        await lido.functions.totalSupply({ blockTag: blockEvent.blockNumber })
      )
    );
    const totalShares = new BigNumber(
      String(
        await lido.functions.getTotalShares({
          blockTag: blockEvent.blockNumber,
        })
      )
    );

    await handleELRewardsVaultOverfill(blockEvent, findings, tvl);
    await handleWithdrawalsVaultOverfill(blockEvent, findings, tvl);
    await handleBurnerUnburntSharesOverfill(blockEvent, findings, totalShares);
  }

  return findings;
}

async function handleELRewardsVaultOverfill(
  blockEvent: BlockEvent,
  findings: Finding[],
  tvl: BigNumber
) {
  const now = blockEvent.block.timestamp;
  const balance = new BigNumber(
    String(
      await ethersProvider.getBalance(
        EL_REWARDS_VAULT_ADDRESS,
        blockEvent.blockNumber
      )
    )
  );
  if (now - lastELOverfillAlertTimestamp > OVERFILL_ALERT_TRIGGER_EVERY) {
    if (balance.div(tvl).times(100).gt(OVERFILL_THRESHOLD_PERCENT)) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ ELRewardsVault overfilled: balance is more than ${OVERFILL_THRESHOLD_PERCENT}% of TVL`,
          description: `Balance: ${balance
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nTVL: ${tvl.div(ETH_DECIMALS).toFixed(3)} ETH`,
          alertId: "LIDO-EL-REWARDS-VAULT-OVERFILLED",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      lastELOverfillAlertTimestamp = now;
    }
  }
}

async function handleWithdrawalsVaultOverfill(
  blockEvent: BlockEvent,
  findings: Finding[],
  tvl: BigNumber
) {
  const now = blockEvent.block.timestamp;
  const balance = new BigNumber(
    String(
      await ethersProvider.getBalance(
        WITHDRAWALS_VAULT_ADDRESS,
        blockEvent.blockNumber
      )
    )
  );
  if (
    now - lastWithdrawalsVaultOverfillAlertTimestamp >
    OVERFILL_ALERT_TRIGGER_EVERY
  ) {
    if (balance.div(tvl).times(100).gt(OVERFILL_THRESHOLD_PERCENT)) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ WithdrawalsVault overfilled: balance is more than ${OVERFILL_THRESHOLD_PERCENT}% of TVL`,
          description: `Balance: ${balance
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nTVL: ${tvl.div(ETH_DECIMALS).toFixed(3)} ETH`,
          alertId: "LIDO-WITHDRAWALS-VAULT-OVERFILLED",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      lastWithdrawalsVaultOverfillAlertTimestamp = now;
    }
  }
}

async function handleBurnerUnburntSharesOverfill(
  blockEvent: BlockEvent,
  findings: Finding[],
  totalShares: BigNumber
) {
  const now = blockEvent.block.timestamp;
  const burner = new ethers.Contract(
    BURNER_ADDRESS,
    BURNER_ABI,
    ethersProvider
  );
  if (now - lastBurnerOverfillAlertTimestamp > OVERFILL_ALERT_TRIGGER_EVERY) {
    const { coverShares, nonCoverShares } =
      await burner.functions.getSharesRequestedToBurn({
        blockTag: blockEvent.blockNumber,
      });
    const unburntShares = new BigNumber(String(coverShares)).plus(
      new BigNumber(String(nonCoverShares))
    );
    if (
      unburntShares.div(totalShares).times(100).gt(OVERFILL_THRESHOLD_PERCENT)
    ) {
      findings.push(
        Finding.fromObject({
          name: `⚠️ Burner overfilled: unburnt shares are more than ${OVERFILL_THRESHOLD_PERCENT}% of total shares`,
          description: `Unburnt: ${unburntShares
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nTotal shares: ${totalShares
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH`,
          alertId: "LIDO-BURNER-UNBURNT-OVERFILLED",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      lastBurnerOverfillAlertTimestamp = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (txEvent.to === ACCOUNTING_ORACLE_ADDRESS) {
    await handleExitedStuckRefundedKeysDigest(txEvent, findings);
    handleWithdrawalsFinalizationDigest(txEvent, findings);
    handleRebaseDigest(txEvent, findings);
    handleAPR(txEvent, findings);
  }

  return findings;
}

function handleAPR(txEvent: TransactionEvent, findings: Finding[]) {
  const [tokenRebasedEvent] = txEvent.filterLog(
    LIDO_TOKEN_REBASED_EVENT,
    LIDO_ADDRESS
  );
  if (!tokenRebasedEvent) return;
  lastRebaseEventTimestamp = txEvent.block.timestamp;
  let timeElapsed = new BigNumber(String(tokenRebasedEvent.args.timeElapsed));
  let preTotalShares = new BigNumber(
    String(tokenRebasedEvent.args.preTotalShares)
  );
  let preTotalEther = new BigNumber(
    String(tokenRebasedEvent.args.preTotalEther)
  );
  let postTotalShares = new BigNumber(
    String(tokenRebasedEvent.args.postTotalShares)
  );
  let postTotalEther = new BigNumber(
    String(tokenRebasedEvent.args.postTotalEther)
  );

  const sharesDiffPercent = postTotalShares
    .minus(preTotalShares)
    .div(preTotalShares)
    .times(100);
  const strSharesDiffPercent =
    Number(sharesDiffPercent) > 0
      ? `+${sharesDiffPercent.toFixed(2)}`
      : sharesDiffPercent.toFixed(2);

  const etherDiffPercent = postTotalEther
    .minus(preTotalEther)
    .div(preTotalEther)
    .times(100);
  const strEtherDiffPercent =
    Number(etherDiffPercent) > 0
      ? `+${etherDiffPercent.toFixed(2)}`
      : etherDiffPercent.toFixed(2);

  let severity = FindingSeverity.Info;
  let name = "ℹ️ Lido Report: APR stats";
  const apr = calculateAPR(
    timeElapsed,
    preTotalShares,
    preTotalEther,
    postTotalShares,
    postTotalEther
  );
  if (apr.gte(LIDO_REPORT_LIMIT_REACHED_APR_THRESHOLD)) {
    name = `⚠️ Lido Report: APR is greater than ${
      LIDO_REPORT_LIMIT_REACHED_APR_THRESHOLD * 100
    }% limit`;
    severity = FindingSeverity.High;
  } else if (apr.gte(LIDO_REPORT_HIGH_APR_THRESHOLD)) {
    name = `⚠️ Lido Report: APR is greater than ${
      LIDO_REPORT_HIGH_APR_THRESHOLD * 100
    }%`;
    severity = FindingSeverity.Medium;
  } else if (apr.lte(LIDO_REPORT_LOW_APR_THRESHOLD)) {
    name = `⚠️ Lido Report: APR is less than ${
      LIDO_REPORT_LOW_APR_THRESHOLD * 100
    }%`;
    severity = FindingSeverity.High;
  }

  findings.push(
    Finding.fromObject({
      name: name,
      alertId: "LIDO-REPORT-APR-STATS",
      description: `APR: ${apr
        .times(100)
        .toFixed(2)}%\nTime elapsed: ${formatDelay(
        Number(timeElapsed)
      )}\nTotal shares: ${preTotalShares
        .div(ETH_DECIMALS)
        .toFixed(3)} -> ${postTotalShares
        .div(ETH_DECIMALS)
        .toFixed(
          3
        )} ETH (${strSharesDiffPercent}%)\nTotal ether: ${preTotalEther
        .div(ETH_DECIMALS)
        .toFixed(3)} -> ${postTotalEther
        .div(ETH_DECIMALS)
        .toFixed(3)} ETH (${strEtherDiffPercent}%)`,
      severity: severity,
      type: FindingType.Info,
    })
  );
}

function handleRebaseDigest(txEvent: TransactionEvent, findings: Finding[]) {
  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_ADDRESS
  );
  if (!ethDistributedEvent) return;
  const [sharesBurntEvent] = txEvent.filterLog(
    LIDO_SHARES_BURNT_EVENT,
    LIDO_ADDRESS
  );
  const sharesBurnt = sharesBurntEvent
    ? new BigNumber(String(sharesBurntEvent.args.sharesAmount)).div(
        ETH_DECIMALS
      )
    : new BigNumber(0);
  const {
    preCLBalance,
    postCLBalance,
    withdrawalsWithdrawn,
    executionLayerRewardsWithdrawn,
  } = ethDistributedEvent.args;
  const clRewards = new BigNumber(String(postCLBalance))
    .minus(new BigNumber(String(preCLBalance)))
    .plus(new BigNumber(String(withdrawalsWithdrawn)))
    .div(ETH_DECIMALS);
  const elRewards = new BigNumber(String(executionLayerRewardsWithdrawn)).div(
    ETH_DECIMALS
  );
  const withdrawals = new BigNumber(String(withdrawalsWithdrawn)).div(
    ETH_DECIMALS
  );

  lastCLrewards = lastCLrewards != BN_ZERO ? lastCLrewards : clRewards;
  const clRewardsDiff = clRewards.minus(lastCLrewards);
  const strCLRewardsDiff =
    Number(clRewardsDiff) > 0
      ? `+${clRewardsDiff.toFixed(3)}`
      : clRewardsDiff.toFixed(3);

  findings.push(
    Finding.fromObject({
      name: "ℹ️ Lido Report: rebase digest",
      description: `CL rewards (includes withdrawn from WithdrawalVault): ${clRewards.toFixed(
        3
      )} ETH (${strCLRewardsDiff} ETH)\nWithdrawn EL rewards: ${elRewards.toFixed(
        3
      )} ETH\nWithdrawn from WithdrawalVault: ${withdrawals.toFixed(
        3
      )} ETH\nShares burnt: ${sharesBurnt.toFixed(3)} ETH`,
      alertId: "LIDO-REPORT-REBASE-DIGEST",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );

  const clRewardsDiffPercent = clRewardsDiff.div(lastCLrewards).times(100);
  const strCLRewardsDiffPercent =
    Number(clRewardsDiffPercent) > 0
      ? `+${clRewardsDiffPercent.toFixed(2)}`
      : clRewardsDiffPercent.toFixed(2);

  if (
    Number(clRewardsDiffPercent) <
    -LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_MEDIUM
  ) {
    const severity =
      Number(clRewardsDiffPercent) <
      -LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_HIGH
        ? FindingSeverity.High
        : FindingSeverity.Medium;
    findings.push(
      Finding.fromObject({
        name: "🚨 Lido Report: CL rewards decreased",
        description:
          `Rewards decreased from ${lastCLrewards.toFixed(
            3
          )} ETH to ${clRewards.toFixed(3)} ` +
          `by ${clRewardsDiff.toFixed(3)} ETH (${strCLRewardsDiffPercent}%)`,
        alertId: "LIDO-REPORT-CL-REWARDS-DECREASED",
        severity: severity,
        type: FindingType.Degraded,
      })
    );
  }

  lastCLrewards = clRewards;
}

async function handleExitedStuckRefundedKeysDigest(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const [extraDataSubmittedEvent] = txEvent.filterLog(
    ACCOUNTING_ORACLE_EXTRA_DATA_SUBMITTED_EVENT,
    ACCOUNTING_ORACLE_ADDRESS
  );
  if (!extraDataSubmittedEvent) return;
  const { allExited, allStuck, allRefunded } = await getSummaryDigest(
    txEvent.blockNumber
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
    })
  );
  lastAllStuck = allStuck;
  lastAllRefunded = allRefunded;
  lastAllExited = allExited;
}

function handleWithdrawalsFinalizationDigest(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const [withdrawalsFinalizedEvent] = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  if (!withdrawalsFinalizedEvent) return;
  const { from, to, amountOfETHLocked, sharesToBurn } =
    withdrawalsFinalizedEvent.args;
  const ether = new BigNumber(String(amountOfETHLocked)).div(ETH_DECIMALS);
  const shares = new BigNumber(String(sharesToBurn)).div(ETH_DECIMALS);
  const requests = Number(to) - Number(from);
  let description = "No one finalized requests";
  if (requests > 0) {
    description = `Requests: ${
      Number(to) - Number(from)
    }\nShares: ${shares.toFixed(2)} ETH\nEther: ${ether.toFixed(2)} ETH`;
  }
  findings.push(
    Finding.fromObject({
      name: "ℹ️ Lido Report: withdrawals finalization digest",
      description: description,
      alertId: "LIDO-REPORT-WITHDRAWALS-FINALIZATION-DIGEST",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );
}

async function getSummaryDigest(block: number) {
  const stakingRouter = new ethers.Contract(
    STAKING_ROUTER_ADDRESS,
    STAKING_ROUTER_ABI,
    ethersProvider
  );

  const [operators] = await stakingRouter.functions.getAllNodeOperatorDigests(
    NODE_OPERATOR_REGISTRY_MODULE_ID,
    { blockTag: block }
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
  postTotalEther: BigNumber
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
