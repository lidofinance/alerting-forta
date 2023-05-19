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
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

export const name = "LidoReport";

// re-fetched from history on startup
let lastCLrewards = BN_ZERO;
let lastELrewards = BN_ZERO;
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
  if (ethDistributedEvents.length > 0) {
    const lastEvent = ethDistributedEvents[ethDistributedEvents.length - 1];

    const [withdrawalsReceivedEvent] = await lido.queryFilter(
      lido.filters.WithdrawalsReceived(),
      lastEvent.blockNumber,
      lastEvent.blockNumber
    );
    const [elRewardsReceivedEvent] = await lido.queryFilter(
      lido.filters.ELRewardsReceived(),
      lastEvent.blockNumber,
      lastEvent.blockNumber
    );
    if (withdrawalsReceivedEvent) {
      const { preCLBalance, postCLBalance } = ethDistributedEvents[
        ethDistributedEvents.length - 1
      ].args as any;

      lastCLrewards = new BigNumber(String(postCLBalance))
        .minus(String(preCLBalance))
        .plus(
          String(new BigNumber(String(withdrawalsReceivedEvent.args?.amount)))
        )
        .div(ETH_DECIMALS);
    }
    if (elRewardsReceivedEvent) {
      lastELrewards = new BigNumber(
        String(elRewardsReceivedEvent.args?.amount)
      ).div(ETH_DECIMALS);
    }
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
            .toFixed(3)} 1e18\nTotal shares: ${totalShares
            .div(ETH_DECIMALS)
            .toFixed(3)} 1e18`,
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
    await Promise.all([
      handleExitedStuckRefundedKeysDigest(txEvent, findings),
      handleRebaseDigest(txEvent, findings),
    ]);
  }

  return findings;
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

async function handleRebaseDigest(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_ADDRESS
  );
  if (!ethDistributedEvent) return;

  const lines = [
    prepareAPRLines(txEvent, findings),
    prepareRewardsLines(txEvent, findings),
    prepareValidatorsCountLines(txEvent),
    await prepareWithdrawnLines(txEvent),
    prepareRequestsFinalizationLines(txEvent),
    prepareSharesBurntLines(txEvent),
  ];

  findings.push(
    Finding.fromObject({
      name: "ℹ️ Lido Report: rebase digest",
      description: lines.filter((l) => l != undefined).join("\n\n"),
      alertId: "LIDO-REPORT-REBASE-DIGEST",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );
}

function prepareAPRLines(
  txEvent: TransactionEvent,
  findings: Finding[]
): string | undefined {
  const [tokenRebasedEvent] = txEvent.filterLog(
    LIDO_TOKEN_REBASED_EVENT,
    LIDO_ADDRESS
  );
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

  const apr = calculateAPR(
    timeElapsed,
    preTotalShares,
    preTotalEther,
    postTotalShares,
    postTotalEther
  );

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

  const additionalDescription = `Total shares: ${preTotalShares
    .div(ETH_DECIMALS)
    .toFixed(3)} -> ${postTotalShares
    .div(ETH_DECIMALS)
    .toFixed(
      3
    )} 1e18 (${strSharesDiffPercent}%)\nTotal pooled ether: ${preTotalEther
    .div(ETH_DECIMALS)
    .toFixed(3)} -> ${postTotalEther
    .div(ETH_DECIMALS)
    .toFixed(3)} ETH (${strEtherDiffPercent}%)\nTime elapsed: ${formatDelay(
    Number(timeElapsed)
  )}`;

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
      })
    );
  }

  return `*APR stats*\n${digestAprStr}\n${additionalDescription}`;
}

function prepareRewardsLines(
  txEvent: TransactionEvent,
  findings: Finding[]
): string {
  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_ADDRESS
  );
  const [withdrawalsReceivedEvent] = txEvent.filterLog(
    LIDO_WITHDRAWALSRECEIVED_EVENT,
    LIDO_ADDRESS
  );
  const [elRewardsReceivedEvent] = txEvent.filterLog(
    LIDO_ELREWARDSRECEIVED_EVENT,
    LIDO_ADDRESS
  );

  const { preCLBalance, postCLBalance } = ethDistributedEvent.args;
  const clValidatorsBalanceDiff = new BigNumber(String(postCLBalance)).minus(
    new BigNumber(String(preCLBalance))
  );
  const withdrawalsReceived = withdrawalsReceivedEvent
    ? new BigNumber(String(withdrawalsReceivedEvent.args.amount))
    : BN_ZERO;
  const clRewards = clValidatorsBalanceDiff
    .plus(withdrawalsReceived)
    .div(ETH_DECIMALS);
  const elRewards = elRewardsReceivedEvent
    ? new BigNumber(String(elRewardsReceivedEvent.args.amount)).div(
        ETH_DECIMALS
      )
    : BN_ZERO;

  lastCLrewards = lastCLrewards.eq(BN_ZERO) ? clRewards : lastCLrewards;
  lastELrewards = lastELrewards.eq(BN_ZERO) ? elRewards : lastELrewards;
  const clRewardsDiff = clRewards.minus(lastCLrewards);
  const elRewardsDiff = elRewards.minus(lastELrewards);
  const totalRewardsDiff = clRewardsDiff.plus(elRewardsDiff);
  const strCLRewardsDiff =
    Number(clRewardsDiff) > 0
      ? `+${clRewardsDiff.toFixed(3)}`
      : clRewardsDiff.toFixed(3);
  const strELRewardsDiff =
    Number(elRewardsDiff) > 0
      ? `+${elRewardsDiff.toFixed(3)}`
      : elRewardsDiff.toFixed(3);
  const strTotalRewardsDiff =
    Number(totalRewardsDiff) > 0
      ? `+${totalRewardsDiff.toFixed(3)}`
      : totalRewardsDiff.toFixed(3);

  let strCLRewards = `CL rewards: ${clRewards.toFixed(
    3
  )} (${strCLRewardsDiff}) ETH`;

  const clRewardsDiffPercent = clRewardsDiff.div(lastCLrewards).times(100);
  const strCLRewardsDiffPercent =
    Number(clRewardsDiffPercent) > 0
      ? `+${clRewardsDiffPercent.toFixed(2)}`
      : clRewardsDiffPercent.toFixed(2);
  if (
    Number(clRewardsDiffPercent) <
    -LIDO_REPORT_CL_REWARDS_DIFF_PERCENT_THRESHOLD_MEDIUM
  ) {
    strCLRewards =
      `️CL rewards: ${clRewards.toFixed(3)} ETH 🚨️ decreased ` +
      `by ${clRewardsDiff.toFixed(3)} ETH (${strCLRewardsDiffPercent}%)`;
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
  lastELrewards = elRewards;

  return `*Rewards*\n${strCLRewards}\nEL rewards: ${elRewards.toFixed(
    3
  )} (${strELRewardsDiff}) ETH\nTotal: ${clRewards
    .plus(elRewards)
    .toFixed(3)} (${strTotalRewardsDiff}) ETH`;
}

function prepareValidatorsCountLines(txEvent: TransactionEvent): string {
  const [validatorsUpdated] = txEvent.filterLog(
    LIDO_VALIDATORS_UPDATED_EVENT,
    LIDO_ADDRESS
  );
  const { preCLValidators, postCLValidators } = validatorsUpdated.args;
  return `*Validators*\nCount: ${postCLValidators} (${
    Number(postCLValidators) - Number(preCLValidators)
  } newly appeared)`;
}

async function prepareWithdrawnLines(
  txEvent: TransactionEvent
): Promise<string> {
  const [ethDistributedEvent] = txEvent.filterLog(
    LIDO_ETHDESTRIBUTED_EVENT,
    LIDO_ADDRESS
  );
  const [elRewardsReceivedEvent] = txEvent.filterLog(
    LIDO_ELREWARDSRECEIVED_EVENT,
    LIDO_ADDRESS
  );

  const elRewardsReceived = elRewardsReceivedEvent
    ? new BigNumber(String(elRewardsReceivedEvent.args.amount))
    : BN_ZERO;

  const {
    withdrawalsWithdrawn,
    executionLayerRewardsWithdrawn,
    postBufferedEther,
  } = ethDistributedEvent.args;
  const wdWithdrawn = new BigNumber(String(withdrawalsWithdrawn)).div(
    ETH_DECIMALS
  );
  const elWithdrawn = new BigNumber(String(executionLayerRewardsWithdrawn));
  const elWithdrawnReceivedDiff = elRewardsReceived.minus(elWithdrawn);

  const lido = new ethers.Contract(LIDO_ADDRESS, LIDO_ABI, ethersProvider);
  const preBufferedEther = await lido.functions.getBufferedEther({
    blockTag: txEvent.blockNumber - 1,
  });
  const bufferDiff = new BigNumber(String(postBufferedEther)).minus(
    preBufferedEther
  );

  return `*Withdrawn from*\nWithdrawal Vault: ${wdWithdrawn.toFixed(
    3
  )} ETH\nEL Vault: ${elWithdrawn.div(ETH_DECIMALS).toFixed(3)} ETH${
    elWithdrawnReceivedDiff.gt(0)
      ? ` ⚠️ ${elWithdrawnReceivedDiff
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH left on the vault`
      : ""
  }\nBuffer: ${
    bufferDiff.lt(0)
      ? bufferDiff.times(-1).div(ETH_DECIMALS).toFixed(3)
      : "0.000"
  } ETH`;
}

function prepareRequestsFinalizationLines(txEvent: TransactionEvent): string {
  const [withdrawalsFinalizedEvent] = txEvent.filterLog(
    WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED_EVENT,
    WITHDRAWAL_QUEUE_ADDRESS
  );
  let description = "No finalized requests";
  if (!withdrawalsFinalizedEvent) {
    return `*Requests finalisation*\n${description}`;
  }
  const [tokenRebasedEvent] = txEvent.filterLog(
    LIDO_TOKEN_REBASED_EVENT,
    LIDO_ADDRESS
  );
  const { postTotalEther, postTotalShares } = tokenRebasedEvent.args;
  const { from, to, amountOfETHLocked } = withdrawalsFinalizedEvent.args;
  const ether = new BigNumber(String(amountOfETHLocked)).div(ETH_DECIMALS);
  const requests = Number(to) - Number(from);
  const shareRate = new BigNumber(String(postTotalEther)).div(
    new BigNumber(String(postTotalShares))
  );
  if (requests > 0) {
    description = `Finalized: ${
      Number(to) - Number(from)
    }\nEther: ${ether.toFixed(3)} ETH\nShare rate: ${shareRate.toFixed(5)}`;
  }
  return `*Requests finalization*\n${description}`;
}

function prepareSharesBurntLines(txEvent: TransactionEvent): string {
  const [sharesBurntEvent] = txEvent.filterLog(
    LIDO_SHARES_BURNT_EVENT,
    LIDO_ADDRESS
  );
  if (!sharesBurntEvent) {
    return `*Shares*\nNo shares burnt`;
  }
  const sharesBurnt = sharesBurntEvent
    ? new BigNumber(String(sharesBurntEvent.args.sharesAmount)).div(
        ETH_DECIMALS
      )
    : new BigNumber(0);
  return `*Shares*\nBurnt: ${sharesBurnt.toFixed(3)} 1e18`;
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
