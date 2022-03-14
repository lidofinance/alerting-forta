import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider } from "./ethers";
import { Event } from "ethers";

import MATIC_ABI from "./abi/MaticToken.json";
import ST_MATIC_ABI from "./abi/stMaticToken.json";
import PROXY_ADMIN_ABI from "./abi/ProxyAdmin.json";
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
} from "./constants";

export const name = "DaoOps";

// 4 hours
const REPORT_WINDOW_BUFFERED_MATIC = 60 * 60 * 4;
// 1 hour
const REPORT_WINDOW_REWARDS_DISTRIBUTION = 60 * 60;
// 15 min
const REPORT_WINDOW_PROXY_ALERTS = 15 * 60;

let lastReportedBufferedMatic = 0;
let timeHighPooledMaticStart = 0;
let lastReportedInvalidProxyOwner = 0;
let lastReportedInvalidProxyAdmin = 0;
let lastRewardsDistributeTime = 0;
let lastReportedRewards = 0;

const byBlockNumberDesc = (e1: Event, e2: Event) =>
  e2.blockNumber - e1.blockNumber;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  const stMATIC = new ethers.Contract(
    ST_MATIC_TOKEN_ADDRESS,
    ST_MATIC_ABI,
    ethersProvider
  );
  const rewardsDistributedFilter = stMATIC.filters.DistributeRewardsEvent();

  // ~25 hours ago
  const pastBlock = currentBlock - Math.ceil((25 * 60 * 60) / 13);
  const distributeEvents = await stMATIC.queryFilter(
    rewardsDistributedFilter,
    pastBlock,
    currentBlock - 1
  );
  if (distributeEvents.length > 0) {
    distributeEvents.sort(byBlockNumberDesc);
    lastRewardsDistributeTime = (await distributeEvents[0].getBlock())
      .timestamp;
  }
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleBufferedMatic(blockEvent, findings),
    handleRewardsDistribution(blockEvent, findings),
    handleProxyAdmin(blockEvent, findings),
  ]);

  return findings;
}

async function handleBufferedMatic(
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

    const bufferedMatic = new BigNumber(
      String(
        await matic.functions
          .balanceOf(ST_MATIC_TOKEN_ADDRESS, {
            blockTag: blockEvent.block.number,
          })
          .then((value) => new BigNumber(String(value)))
          .then((value) => value.div(MATIC_DECIMALS))
      )
    );

    const totalPooledMatic = new BigNumber(
      String(
        await stMatic.functions
          .getTotalPooledMatic({
            blockTag: blockEvent.block.number,
          })
          .then((value) => new BigNumber(String(value)))
          .then((value) => value.div(MATIC_DECIMALS))
      )
    );

    if (
      bufferedMatic.isGreaterThanOrEqualTo(
        totalPooledMatic.div(100).times(MAX_BUFFERED_MATIC_DAILY_PERCENT)
      )
    ) {
      timeHighPooledMaticStart =
        timeHighPooledMaticStart != 0 ? timeHighPooledMaticStart : now;
    } else {
      timeHighPooledMaticStart = 0;
    }

    if (
      bufferedMatic.isGreaterThanOrEqualTo(
        totalPooledMatic.div(100).times(MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT)
      )
    ) {
      findings.push(
        Finding.fromObject({
          name: "Huge buffered MATIC amount",
          description: `There are ${bufferedMatic.toFixed(
            4
          )} (more than ${MAX_BUFFERED_MATIC_IMMEDIATE_PERCENT}% of total pooled MATIC) buffered MATIC in stMATIC contract`,
          alertId: "HUGE-BUFFERED-MATIC",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedMatic = now;
    } else if (
      timeHighPooledMaticStart != 0 &&
      now - timeHighPooledMaticStart > FULL_24_HOURS
    ) {
      findings.push(
        Finding.fromObject({
          name: "High buffered MATIC amount",
          description: `There are ${bufferedMatic.toFixed(
            4
          )} (more than ${MAX_BUFFERED_MATIC_DAILY_PERCENT}% of total pooled MATIC) buffered MATIC in stMATIC contract for more than ${Math.floor(
            (now - timeHighPooledMaticStart) / (60 * 60)
          )} hours`,
          alertId: "HIGH-BUFFERED-MATIC",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedMatic = now;
    }
  }
}

async function handleRewardsDistribution(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  const rewardsDistributionDelay = now - lastRewardsDistributeTime;
  let description = ''
  if (
    lastReportedRewards + REPORT_WINDOW_BUFFERED_MATIC < now &&
    rewardsDistributionDelay > MAX_REWARDS_DISTRIBUTION_INTERVAL
  ) {
    if (lastReportedBufferedMatic == 0) {
      description = `Far more that ${Math.floor(MAX_REWARDS_DISTRIBUTION_INTERVAL / (60 * 60))} hours passed since last stMATIC rewards distribution. NOTE: Last rewards distribution event was not found. Usually it means that there is a huge delay in rewards distribution!`
    } else {
      description = `More that ${Math.floor(rewardsDistributionDelay / (60 * 60))} hours passed since last stMATIC rewards distribution`
    }
    findings.push(
      Finding.fromObject({
        name: "stMATIC rewards distribution delay",
        description: description,
        alertId: "STMATIC-REWARDS-DISTRIBUTION-DELAY",
        severity: FindingSeverity.High,
        type: FindingType.Degraded,
      })
    );
    lastReportedRewards = now;
  }
}

async function handleProxyAdmin(blockEvent: BlockEvent, findings: Finding[]) {
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
          name: "Invalid proxy admin owner (detected by method call)",
          description: `Owner of proxy admin is ${proxyOwner} but should be ${OWNER_MULTISIG_ADDRESS}`,
          alertId: "INVALID-PROXY-ADMIN-OWNER",
          severity: FindingSeverity.Critical,
          type: FindingType.Exploit,
        })
      );
      lastReportedInvalidProxyOwner = now;
    }
  }

  if (lastReportedInvalidProxyAdmin + REPORT_WINDOW_PROXY_ALERTS < now) {
    let proxyAdminFor = "";
    await Object.entries(LIDO_ON_POLYGON_PROXIES).forEach(
      async ([contractName, contractAddr]) => {
        proxyAdminFor = String(
          await proxyAdmin.functions.getProxyAdmin(contractAddr, {
            blockTag: blockEvent.block.number,
          })
        ).toLowerCase();

        if (proxyAdminFor != PROXY_ADMIN_ADDRESS) {
          findings.push(
            Finding.fromObject({
              name: `Invalid proxy admin for ${contractName}`,
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
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];
  await Promise.all([
    handleProxyAdminEvents(txEvent, findings),
    handleRewardDistributionEvent(txEvent, findings),
    handleStMaticTx(txEvent, findings),
  ]);
  return findings;
}

function handleRewardDistributionEvent(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (txEvent.to == ST_MATIC_TOKEN_ADDRESS) {
    const [event] = txEvent.filterLog(
      ST_MATIC_DISTRIBUTE_REWARDS_EVENT,
      ST_MATIC_TOKEN_ADDRESS
    );
    if (event) {
      lastRewardsDistributeTime = txEvent.timestamp;
    }
  }
}

function handleProxyAdminEvents(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  if (txEvent.to == PROXY_ADMIN_ADDRESS) {
    const [event] = txEvent.filterLog(
      PROXY_ADMIN_OWNERSHIP_TRANSFERRED_EVENT,
      PROXY_ADMIN_ADDRESS
    );
    if (event) {
      findings.push(
        Finding.fromObject({
          name: "Proxy admin owner has changed (detected by event)",
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
  ST_MATIC_ADMIN_EVENTS.forEach((eventInfo) => {
    if (txEvent.to === eventInfo.address) {
      const [event] = txEvent.filterLog(eventInfo.event, eventInfo.address);
      if (event) {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: eventInfo.type,
            metadata: { args: String(event.args) },
          })
        );
      }
    }
  });
}
