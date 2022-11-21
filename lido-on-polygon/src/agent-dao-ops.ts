import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
  TxEventBlock,
} from "forta-agent";

import { ethersProvider } from "./ethers";

import MATIC_ABI from "./abi/MaticToken.json";
import ST_MATIC_ABI from "./abi/stMaticToken.json";
import PROXY_ADMIN_ABI from "./abi/ProxyAdmin.json";
import POLYGON_ROOT_CHAIN_ABI from "./abi/RootChain.json";
import {
  MATIC_TOKEN_ADDRESS,
  ST_MATIC_TOKEN_ADDRESS,
  FULL_24_HOURS,
  MATIC_DECIMALS,
  MAX_BUFFERED_MATIC_DAILY_PERCENT,
  MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT,
  PROXY_ADMIN_ADDRESS,
  OWNER_MULTISIG_ADDRESS,
  LIDO_ON_POLYGON_PROXIES,
  PROXY_ADMIN_OWNERSHIP_TRANSFERRED_EVENT,
  ST_MATIC_ADMIN_EVENTS,
  ST_MATIC_DISTRIBUTE_REWARDS_EVENT,
  MAX_REWARDS_DISTRIBUTION_INTERVAL,
  MAX_REWARDS_DECREASE,
  MIN_DEPOSIT_EXECUTOR_BALANCE,
  ETH_DECIMALS,
  LIDO_DEPOSIT_EXECUTOR_ADDRESS,
  ONE_HOUR,
  CHEKPOINT_REWARD_UPDATED_EVENT,
  POLYGON_ROOT_CHAIN_PROXY,
  SECS_PER_BLOCK,
  REWARDS_ESTIMATE_TO_ACTUAL_DIFF,
} from "./constants";
import { byBlockNumberDesc } from "./utils/tools";
import { Event } from "ethers";

export const name = "DaoOps";

// 4 hours
const REPORT_WINDOW_BUFFERED_MATIC = 60 * 60 * 4;
// 4 hour
const REPORT_WINDOW_REWARDS_DISTRIBUTION = 60 * 60 * 4;
// 15 min
const REPORT_WINDOW_PROXY_ALERTS = 15 * 60;
// 6 hours
const REPORT_WINDOW_EXECUTOR_BALANCE = 60 * 60 * 6;

let highPooledMaticStart = 0;
let hugePooledMaticStart = 0;
let lastReportedBufferedMatic = 0;
let lastReportedInvalidProxyOwner = 0;
let lastReportedInvalidProxyAdmin = 0;
let lastRewardsDistributeTime = 0;
let lastRewardsDistributeBlock: TxEventBlock;
let checkpointsInLastInterval = 0;
let lastReportedRewards = 0;
let lastRewardsAmount = new BigNumber(0);
let lastReportedExecutorBalance = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  if (currentBlock === undefined) {
    throw Error(
      `No block identifier provided to ${name} agent initialize function`
    );
  }

  const latestDistributeEvent = await getPrevDistributeEvent(currentBlock);

  if (latestDistributeEvent) {
    lastRewardsDistributeBlock = await latestDistributeEvent.getBlock();
    lastRewardsDistributeTime = lastRewardsDistributeBlock.timestamp;
    if (latestDistributeEvent.args) {
      lastRewardsAmount = new BigNumber(
        String(latestDistributeEvent.args._amount)
      );
    }

    const prevToLatestDistributeEvent = await getPrevDistributeEvent(
      lastRewardsDistributeBlock.number
    );
    if (prevToLatestDistributeEvent) {
      checkpointsInLastInterval = await getCheckpointsCount(
        prevToLatestDistributeEvent.blockNumber,
        lastRewardsDistributeBlock.number
      );

      console.log(
        `[${name}] checkpointsInLastInterval: ${checkpointsInLastInterval}`
      );
    }
  }

  console.log(
    `[${name}] lastRewardsDistributeTime: ${lastRewardsDistributeTime}`
  );

  return {
    lastRewardsDistributeTime: `${lastRewardsDistributeTime}`,
    lastRewardsAmount: `${lastRewardsAmount}`,
  };
}

async function getPrevDistributeEvent(
  lastBlock: number
): Promise<Event | undefined> {
  const stMATIC = new ethers.Contract(
    ST_MATIC_TOKEN_ADDRESS,
    ST_MATIC_ABI,
    ethersProvider
  );

  const rewardsDistributedFilter = stMATIC.filters.DistributeRewardsEvent();
  // ~25 hours ago
  const pastBlock = lastBlock - Math.ceil((25 * ONE_HOUR) / SECS_PER_BLOCK);
  const distributeEvents = await stMATIC.queryFilter(
    rewardsDistributedFilter,
    pastBlock,
    lastBlock - 1
  );

  distributeEvents.sort(byBlockNumberDesc);
  return distributeEvents.at(0);
}

async function getCheckpointsCount(
  fromBlock: number,
  toBlock: number
): Promise<number> {
  const rootChain = new ethers.Contract(
    POLYGON_ROOT_CHAIN_PROXY,
    POLYGON_ROOT_CHAIN_ABI,
    ethersProvider
  );
  const checkpoints = await rootChain.queryFilter(
    rootChain.filters.NewHeaderBlock(),
    fromBlock,
    toBlock - 1
  );

  return checkpoints.length;
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleBufferedMatic(blockEvent, findings),
    handleRewardsDistribution(blockEvent, findings),
    handleProxyAdmin(blockEvent, findings),
    handleProxyOwner(blockEvent, findings),
    handleDepositExecutorBalance(blockEvent, findings),
  ]);

  return findings;
}

export async function handleBufferedMatic(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedBufferedMatic + REPORT_WINDOW_BUFFERED_MATIC < now) {
    const matic = new ethers.Contract(
      MATIC_TOKEN_ADDRESS,
      MATIC_ABI,
      ethersProvider
    );

    const stMatic = new ethers.Contract(
      ST_MATIC_TOKEN_ADDRESS,
      ST_MATIC_ABI,
      ethersProvider
    );

    const bufferedMatic = await matic.functions
      .balanceOf(ST_MATIC_TOKEN_ADDRESS, {
        blockTag: blockEvent.block.number,
      })
      .then((value) => new BigNumber(String(value)))
      .then((value) => value.div(MATIC_DECIMALS));

    const totalPooledMatic = await stMatic.functions
      .getTotalPooledMatic({
        blockTag: blockEvent.block.number,
      })
      .then((value) => new BigNumber(String(value)))
      .then((value) => value.div(MATIC_DECIMALS));

    const bufferedMaticPercent = bufferedMatic.div(totalPooledMatic).times(100);

    if (
      bufferedMaticPercent.isGreaterThanOrEqualTo(
        MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT
      )
    ) {
      hugePooledMaticStart =
        hugePooledMaticStart != 0 ? hugePooledMaticStart : now;
    } else {
      hugePooledMaticStart = 0;
    }

    if (
      bufferedMaticPercent.isGreaterThanOrEqualTo(
        MAX_BUFFERED_MATIC_DAILY_PERCENT
      )
    ) {
      highPooledMaticStart =
        highPooledMaticStart != 0 ? highPooledMaticStart : now;
    } else {
      highPooledMaticStart = 0;
    }

    if (hugePooledMaticStart != 0 && now - hugePooledMaticStart > ONE_HOUR) {
      findings.push(
        Finding.fromObject({
          name: "🚨 Huge buffered MATIC amount",
          description:
            `There are ${bufferedMatic.toFixed(4)} ` +
            `(more than ${MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT}% of total pooled MATIC) buffered MATIC in stMATIC contract for more than ` +
            `${Math.floor((now - hugePooledMaticStart) / ONE_HOUR)} hours`,
          alertId: "HUGE-BUFFERED-MATIC",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedMatic = now;
    } else if (
      highPooledMaticStart != 0 &&
      now - highPooledMaticStart > FULL_24_HOURS
    ) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ High buffered MATIC amount",
          description:
            `There are ${bufferedMatic.toFixed(4)} ` +
            `(more than ${MAX_BUFFERED_MATIC_DAILY_PERCENT}% of total pooled MATIC) buffered MATIC in stMATIC contract for more than ` +
            `${Math.floor((now - highPooledMaticStart) / ONE_HOUR)} hours`,
          alertId: "HIGH-BUFFERED-MATIC",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedMatic = now;
    }
  }
}

export async function handleRewardsDistribution(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  const rewardsDistributionDelay = now - lastRewardsDistributeTime;
  let description = "";
  if (
    lastReportedRewards + REPORT_WINDOW_REWARDS_DISTRIBUTION < now &&
    rewardsDistributionDelay > MAX_REWARDS_DISTRIBUTION_INTERVAL
  ) {
    if (lastRewardsDistributeTime == 0) {
      description =
        `Far more than ` +
        `${Math.floor(MAX_REWARDS_DISTRIBUTION_INTERVAL / (60 * 60))} ` +
        `hours passed since last stMATIC rewards distribution. NOTE: Last rewards distribution event was not found. Usually it means that there is a huge delay in rewards distribution!`;
    } else {
      description = `More than ${Math.floor(
        rewardsDistributionDelay / (60 * 60)
      )} hours passed since last stMATIC rewards distribution`;
    }
    findings.push(
      Finding.fromObject({
        name: "⚠️ stMATIC rewards distribution delay",
        description: description,
        alertId: "STMATIC-REWARDS-DISTRIBUTION-DELAY",
        severity: FindingSeverity.High,
        type: FindingType.Degraded,
      })
    );
    lastReportedRewards = now;
  }
}

export async function handleProxyAdmin(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;

  const proxyAdmin = new ethers.Contract(
    PROXY_ADMIN_ADDRESS,
    PROXY_ADMIN_ABI,
    ethersProvider
  );

  if (lastReportedInvalidProxyAdmin + REPORT_WINDOW_PROXY_ALERTS < now) {
    let proxyAdminFor = "";
    const promises = Object.entries(LIDO_ON_POLYGON_PROXIES).map(
      async ([contractName, contractAddr]) => {
        proxyAdminFor = String(
          await proxyAdmin.functions.getProxyAdmin(contractAddr, {
            blockTag: blockEvent.block.number,
          })
        ).toLowerCase();

        if (proxyAdminFor != PROXY_ADMIN_ADDRESS) {
          findings.push(
            Finding.fromObject({
              name: `🚨 Invalid proxy admin for ${contractName}`,
              description: `Proxy admin address for ${contractName}[${contractAddr}] is ${proxyAdminFor} but should be ${PROXY_ADMIN_ADDRESS}`,
              alertId: "INVALID-PROXY-ADMIN-ADDR",
              severity: FindingSeverity.Critical,
              type: FindingType.Exploit,
            })
          );
          lastReportedInvalidProxyAdmin = now;
        }
      }
    );

    await Promise.all(promises);
  }
}

export async function handleProxyOwner(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;

  const proxyAdmin = new ethers.Contract(
    PROXY_ADMIN_ADDRESS,
    PROXY_ADMIN_ABI,
    ethersProvider
  );

  if (lastReportedInvalidProxyOwner + REPORT_WINDOW_PROXY_ALERTS < now) {
    const proxyOwner = String(
      await proxyAdmin.functions.owner({ blockTag: blockEvent.block.number })
    ).toLowerCase();

    if (proxyOwner != OWNER_MULTISIG_ADDRESS) {
      findings.push(
        Finding.fromObject({
          name: "🚨 Invalid proxy admin owner (detected by method call)",
          description: `Owner of proxy admin is ${proxyOwner} but should be ${OWNER_MULTISIG_ADDRESS}`,
          alertId: "INVALID-PROXY-ADMIN-OWNER",
          severity: FindingSeverity.Critical,
          type: FindingType.Exploit,
        })
      );
      lastReportedInvalidProxyOwner = now;
    }
  }
}

export async function handleDepositExecutorBalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (
    lastReportedExecutorBalance + REPORT_WINDOW_EXECUTOR_BALANCE < now &&
    blockEvent.blockNumber % 100 == 0
  ) {
    const executorBalance = await ethersProvider
      .getBalance(LIDO_DEPOSIT_EXECUTOR_ADDRESS, blockEvent.blockNumber)
      .then((value) => new BigNumber(String(value)))
      .then((value) => value.div(ETH_DECIMALS).toNumber());
    if (executorBalance < MIN_DEPOSIT_EXECUTOR_BALANCE) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Low deposit executor balance (Lido on Polygon)",
          description:
            `Balance of deposit executor (${LIDO_DEPOSIT_EXECUTOR_ADDRESS}) ` +
            `is ${executorBalance.toFixed(4)} ETH. This is extremely low!`,
          alertId: "LOW-DEPOSIT-EXECUTOR-BALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedExecutorBalance = now;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  await Promise.all([
    handleProxyAdminEvents(txEvent, findings),
    handleRewardDistributionEvent(txEvent, findings),
    handleChekpointRewardUpdateEvent(txEvent, findings),
    handleStMaticTx(txEvent, findings),
  ]);
  return findings;
}

export async function handleRewardDistributionEvent(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (txEvent.to !== ST_MATIC_TOKEN_ADDRESS) {
    return;
  }

  const events = txEvent.filterLog(
    ST_MATIC_DISTRIBUTE_REWARDS_EVENT,
    ST_MATIC_TOKEN_ADDRESS
  );

  const event = events.at(0);
  if (!event) {
    return;
  }

  // last distribution event was not found on init
  if (!lastRewardsDistributeBlock) {
    lastRewardsDistributeBlock = txEvent.block;
    lastRewardsDistributeTime = txEvent.timestamp;
    lastRewardsAmount = new BigNumber(String(event.args._amount));

    return;
  }

  const rewardsAmount = new BigNumber(String(event.args._amount));
  const rewardsChangePercent = rewardsAmount
    .div(lastRewardsAmount)
    .minus(1)
    .times(100);

  // estimate change on checkpoints count
  const checkpointsCount = await getCheckpointsCount(
    lastRewardsDistributeBlock.number,
    txEvent.blockNumber
  );

  const estimatedChangePercent =
    checkpointsInLastInterval > 0
      ? 100 * (checkpointsCount / checkpointsInLastInterval - 1)
      : 0;

  if (
    rewardsChangePercent.isLessThanOrEqualTo(-MAX_REWARDS_DECREASE) &&
    rewardsChangePercent
      .minus(estimatedChangePercent)
      .isLessThanOrEqualTo(-REWARDS_ESTIMATE_TO_ACTUAL_DIFF)
  ) {
    findings.push(
      Finding.fromObject({
        name: `⚠️ stMATIC rewards decreased`,
        description:
          `stMATIC rewards has decreased by ${rewardsChangePercent.toFixed(
            2
          )}% from ${lastRewardsAmount
            .div(MATIC_DECIMALS)
            .toFixed(4)} MATIC to ${rewardsAmount
            .div(MATIC_DECIMALS)
            .toFixed(4)} MATIC (${rewardsAmount
            .minus(lastRewardsAmount)
            .div(MATIC_DECIMALS)
            .toFixed(4)} MATIC). ` +
          `The decrease is deeper than network ` +
          `expectation (${estimatedChangePercent.toFixed(2)}%)`,
        alertId: "STMATIC-REWARDS-DECREASED",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  }
  lastRewardsDistributeBlock = txEvent.block;
  lastRewardsDistributeTime = txEvent.timestamp;
  lastRewardsAmount = rewardsAmount;
}

export function handleProxyAdminEvents(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (txEvent.to == PROXY_ADMIN_ADDRESS) {
    const events = txEvent.filterLog(
      PROXY_ADMIN_OWNERSHIP_TRANSFERRED_EVENT,
      PROXY_ADMIN_ADDRESS
    );
    for (const event of events) {
      findings.push(
        Finding.fromObject({
          name: "🚨 Proxy admin owner has changed (detected by event)",
          description: `New owner of proxy admin is ${event.args[1]}`,
          alertId: "PROXY-ADMIN-OWNER-CHANGE",
          severity: FindingSeverity.Critical,
          type: FindingType.Suspicious,
        })
      );
    }
  }
}

function handleStMaticTx(txEvent: TransactionEvent, findings: Finding[]) {
  const now = txEvent.block.timestamp;
  ST_MATIC_ADMIN_EVENTS.forEach((eventInfo) => {
    if (txEvent.to === eventInfo.address) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        let severity = eventInfo.severity;
        // Bump alert severity if there was delay alert
        if (
          eventInfo.alertId == "STMATIC-CONTRACT-REWARDS-DISTRIBUTED" &&
          now - lastReportedRewards < REPORT_WINDOW_REWARDS_DISTRIBUTION
        ) {
          severity = FindingSeverity.Medium;
        }
        if (
          eventInfo.alertId == "STMATIC-CONTRACT-POOLED-MATIC-DELEGATED" &&
          now - lastReportedBufferedMatic < REPORT_WINDOW_BUFFERED_MATIC
        ) {
          severity = FindingSeverity.Medium;
        }
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: severity,
            type: eventInfo.type,
            metadata: { args: String(event.args) },
          })
        );
      });
    }
  });
}

export function handleChekpointRewardUpdateEvent(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const fmtReward = (v: any) => new BigNumber(v.toString()).div(MATIC_DECIMALS);
  // looks like there is no guaranteed contract to check a transaction against
  const events = txEvent.filterLog(CHEKPOINT_REWARD_UPDATED_EVENT);
  for (const event of events) {
    const [oldReward, newReward] = [
      fmtReward(event.args.oldReward),
      fmtReward(event.args.newReward),
    ];
    const delta = newReward
      .minus(oldReward)
      .div(oldReward)
      .times(100)
      .toFixed(2);

    findings.push(
      Finding.fromObject({
        name: "ℹ Polygon checkpoint reward was changed",
        description: `Change ${delta}%, \nnew reward: ${newReward}, \nold reward: ${oldReward}`,
        alertId: "STMATIC-CHEKPOINT-REWARD-UPDATE",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  }
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
