import BigNumber from "bignumber.js";

import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { etherscanProvider, ethersProvider } from "../../ethers";

import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";
import LIDO_ABI from "../../abi/Lido.json";
import MEV_ALLOW_LIST_ABI from "../../abi/MEVBoostRelayAllowedList.json";
import ENS_BASE_REGISTRAR_ABI from "../../abi/ENS.json";

import { ETH_DECIMALS, ONE_MONTH, ONE_WEEK } from "../../common/constants";

import {
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";

export const name = "DaoOps";

const {
  REPORT_WINDOW,
  REPORT_WINDOW_EXECUTOR_BALANCE,
  REPORT_WINDOW_STAKING_LIMIT_10,
  REPORT_WINDOW_STAKING_LIMIT_30,
  MEV_RELAY_COUNT_THRESHOLD_HIGH,
  MEV_RELAY_COUNT_THRESHOLD_INFO,
  MEV_RELAY_COUNT_REPORT_WINDOW,
  LIDO_ADDRESS,
  LIDO_DEPOSIT_SECURITY_ADDRESS,
  LIDO_DEPOSIT_EXECUTOR_ADDRESS,
  MEV_ALLOWED_LIST_ADDRESS,
  ENS_BASE_REGISTRAR_ADDRESS,
  NODE_OPERATORS_REGISTRY_ADDRESS,
  MIN_AVAILABLE_KEYS_COUNT,
  MIN_DEPOSIT_EXECUTOR_BALANCE,
  MAX_DEPOSITOR_TX_DELAY,
  MAX_BUFFERED_ETH_AMOUNT_MEDIUM,
  MAX_BUFFERED_ETH_AMOUNT_CRITICAL,
  MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME,
  ENS_CHECK_INTERVAL,
  LIDO_ENS_NAMES,
  LIDO_EVENTS_OF_NOTICE,
  DEPOSIT_SECURITY_EVENTS_OF_NOTICE,
  MEV_ALLOWED_LIST_EVENTS_OF_NOTICE,
  INSURANCE_FUND_EVENTS_OF_NOTICE,
  TRP_EVENTS_OF_NOTICE,
  BURNER_EVENTS_OF_NOTICE,
  BLOCK_CHECK_INTERVAL,
} = requireWithTier<typeof Constants>(
  module,
  "./constants",
  RedefineMode.Merge
);

let lastReportedKeysShortage = 0;
let lastReportedBufferedEth = 0;
let lastDepositorTxTime = 0;
let criticalBufferAmountFrom = 0;
let lastReportedExecutorBalance = 0;
let lastReportedStakingLimit10 = 0;
let lastReportedStakingLimit30 = 0;
let lastReportedMevCountInfo = 0;
let lastReportedMevCountHigh = 0;
// remove once depositor bot is switched on
let lastBufferedEth = new BigNumber(0);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  let history = await etherscanProvider.getHistory(
    LIDO_DEPOSIT_SECURITY_ADDRESS,
    currentBlock - Math.floor((60 * 60 * 72) / 13),
    currentBlock - 1
  );
  const depositorTxTimestamps = history.map((x) =>
    x.timestamp ? x.timestamp : 0
  );
  if (depositorTxTimestamps.length > 0) {
    depositorTxTimestamps.sort((a, b) => b - a);
    lastDepositorTxTime = depositorTxTimestamps[0];
  }
  console.log(`[${name}] lastDepositorTxTime=${lastDepositorTxTime}`);
  // remove once depositor bot is switched on
  lastBufferedEth = new BigNumber(
    String(await ethersProvider.getBalance(LIDO_ADDRESS, currentBlock))
  );
  console.log(`[${name}] lastBufferedEth=${lastBufferedEth.div(ETH_DECIMALS).toFixed(2)}`);
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleNodeOperatorsKeys(blockEvent, findings),
    handleBufferedEth(blockEvent, findings),
    handleDepositExecutorBalance(blockEvent, findings),
    handleStakingLimit(blockEvent, findings),
    handleMevRelayCount(blockEvent, findings),
    handleEnsNamesExpiration(blockEvent, findings),
  ]);

  return findings;
}

async function handleNodeOperatorsKeys(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedKeysShortage + REPORT_WINDOW < now) {
    const nodeOperatorsRegistry = new ethers.Contract(
      NODE_OPERATORS_REGISTRY_ADDRESS,
      NODE_OPERATORS_REGISTRY_ABI,
      ethersProvider
    );
    const nodeOperatorsCount =
      await nodeOperatorsRegistry.functions.getActiveNodeOperatorsCount({
        blockTag: blockEvent.block.number,
      });
    let availableKeys: Promise<any>[] = [];
    let availableKeysCount = 0;
    for (let i = 0; i < nodeOperatorsCount; i++) {
      availableKeys.push(
        nodeOperatorsRegistry.functions
          .getUnusedSigningKeyCount(i, {
            blockTag: blockEvent.block.number,
          })
          .then((value) => (availableKeysCount += parseInt(String(value))))
      );
    }
    await Promise.all(availableKeys);
    if (availableKeysCount < MIN_AVAILABLE_KEYS_COUNT) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Few available keys count",
          description: `There are only ${availableKeysCount} available keys left`,
          alertId: "LOW-OPERATORS-AVAILABLE-KEYS-NUM",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
        })
      );
      lastReportedKeysShortage = now;
    }
  }
}

async function handleBufferedEth(blockEvent: BlockEvent, findings: Finding[]) {
  const blockNumber = blockEvent.block.number;
  if (blockNumber % BLOCK_CHECK_INTERVAL !== 0) {
    return;
  }

  const now = blockEvent.block.timestamp;
  const lido = new ethers.Contract(LIDO_ADDRESS, LIDO_ABI, ethersProvider);
  const bufferedEthRaw = new BigNumber(
    String(
      await lido.functions.getBufferedEther({
        blockTag: blockEvent.block.number,
      })
    )
  );
  const bufferedEth = bufferedEthRaw.div(ETH_DECIMALS).toNumber();
  // Keep track of buffer size above MAX_BUFFERED_ETH_AMOUNT_CRITICAL
  if (bufferedEth > MAX_BUFFERED_ETH_AMOUNT_CRITICAL) {
    criticalBufferAmountFrom =
      criticalBufferAmountFrom != 0 ? criticalBufferAmountFrom : now;
  } else {
    // reset counter if buffered amount goes below MAX_BUFFERED_ETH_AMOUNT_CRITICAL
    criticalBufferAmountFrom = 0;
  }
  if (lastReportedBufferedEth + REPORT_WINDOW < now) {
    if (
      bufferedEth > MAX_BUFFERED_ETH_AMOUNT_CRITICAL &&
      criticalBufferAmountFrom < now - MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME
    ) {
      findings.push(
        Finding.fromObject({
          name: "🚨 Huge buffered ETH amount",
          description:
            `There are ${bufferedEth.toFixed(4)} ` +
            `buffered ETH in DAO for more than ` +
            `${Math.floor(
              MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME / (60 * 60)
            )} hour(s)`,
          alertId: "HUGE-BUFFERED-ETH",
          severity: FindingSeverity.High,
          type: FindingType.Degraded,
        })
      );
      lastReportedBufferedEth = now;
    } else if (
      bufferedEth > MAX_BUFFERED_ETH_AMOUNT_MEDIUM &&
      lastDepositorTxTime < now - MAX_DEPOSITOR_TX_DELAY &&
      lastDepositorTxTime !== 0
    ) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ High buffered ETH amount",
          description:
            `There are ${bufferedEth.toFixed(4)} ` +
            `buffered ETH in DAO and there are more than ` +
            `${Math.floor(MAX_DEPOSITOR_TX_DELAY / (60 * 60))} ` +
            `hours since last Depositor TX`,
          alertId: "HIGH-BUFFERED-ETH",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedEth = now;
    }
  }
  // remove once depositor bot is switched on
  if (bufferedEthRaw.lt(lastBufferedEth)) {
    findings.push(
      Finding.fromObject({
        name: "🚨🚨🚨 Buffered ETH amount decreased",
        description:
          `Buffered ETH amount decreased from ` +
          `${lastBufferedEth.div(ETH_DECIMALS).toFixed(2)} ` +
          `to ${bufferedEth.toFixed(2)} while depositor is switched off`,
        alertId: "BUFFERED-ETH-DECREASED",
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
      })
    );
  }
}

async function handleDepositExecutorBalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const blockNumber = blockEvent.block.number;
  if (blockNumber % BLOCK_CHECK_INTERVAL !== 0) {
    return;
  }

  const now = blockEvent.block.timestamp;
  if (lastReportedExecutorBalance + REPORT_WINDOW_EXECUTOR_BALANCE < now) {
    const executorBalanceRaw = new BigNumber(
      String(
        await ethersProvider.getBalance(
          LIDO_DEPOSIT_EXECUTOR_ADDRESS,
          blockEvent.blockNumber
        )
      )
    );
    const executorBalance = executorBalanceRaw.div(ETH_DECIMALS).toNumber();
    if (executorBalance < MIN_DEPOSIT_EXECUTOR_BALANCE) {
      findings.push(
        Finding.fromObject({
          name: "⚠️ Low deposit executor balance",
          description:
            `Balance of deposit executor is ${executorBalance.toFixed(4)}. ` +
            `This is extremely low! 😱`,
          alertId: "LOW-DEPOSIT-EXECUTOR-BALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedExecutorBalance = now;
    }
  }
}

async function handleStakingLimit(blockEvent: BlockEvent, findings: Finding[]) {
  const blockNumber = blockEvent.block.number;
  if (blockNumber % BLOCK_CHECK_INTERVAL !== 0) {
    return;
  }

  const now = blockEvent.block.timestamp;
  const lido = new ethers.Contract(LIDO_ADDRESS, LIDO_ABI, ethersProvider);
  const stakingLimitInfo = await lido.functions.getStakeLimitFullInfo({
    blockTag: blockEvent.block.number,
  });
  const currentStakingLimit = new BigNumber(
    String(stakingLimitInfo.currentStakeLimit)
  ).div(ETH_DECIMALS);
  const maxStakingLimit = new BigNumber(
    String(stakingLimitInfo.maxStakeLimit)
  ).div(ETH_DECIMALS);
  if (
    lastReportedStakingLimit10 + REPORT_WINDOW_STAKING_LIMIT_10 < now &&
    currentStakingLimit.isLessThan(maxStakingLimit.times(0.1))
  ) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ Staking limit below 10%",
        description:
          `Current staking limit is ${currentStakingLimit.toFixed(2)} ETH ` +
          `this is lower than 10% of max staking limit ` +
          `${maxStakingLimit.toFixed(2)} ETH`,
        alertId: "LOW-STAKING-LIMIT",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
    lastReportedStakingLimit10 = now;
  } else if (
    lastReportedStakingLimit30 + REPORT_WINDOW_STAKING_LIMIT_30 < now &&
    currentStakingLimit.isLessThan(maxStakingLimit.times(0.3))
  ) {
    findings.push(
      Finding.fromObject({
        name: "📉 Staking limit below 30%",
        description:
          `Current staking limit is ${currentStakingLimit.toFixed(2)} ETH ` +
          `this is lower than 30% of max staking limit ` +
          `${maxStakingLimit.toFixed(2)} ETH`,
        alertId: "LOW-STAKING-LIMIT",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
    lastReportedStakingLimit30 = now;
  }
}

async function handleMevRelayCount(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const blockNumber = blockEvent.block.number;
  if (blockNumber % BLOCK_CHECK_INTERVAL !== 0) {
    return;
  }

  const now = blockEvent.block.timestamp;
  const mevAllowList = new ethers.Contract(
    MEV_ALLOWED_LIST_ADDRESS,
    MEV_ALLOW_LIST_ABI,
    ethersProvider
  );
  const mevRelays = await mevAllowList.functions.get_relays({
    blockTag: blockEvent.block.number,
  });
  const mevRelaysLength = mevRelays[0].length;
  if (
    mevRelaysLength < MEV_RELAY_COUNT_THRESHOLD_HIGH &&
    lastReportedMevCountHigh + MEV_RELAY_COUNT_REPORT_WINDOW < now
  ) {
    findings.push(
      Finding.fromObject({
        name: "🚨 MEV Allow list: Super low relay count",
        description: `There are only ${mevRelaysLength} relays in the allowed list.`,
        alertId: "MEV-LOW-RELAY-COUNT",
        severity: FindingSeverity.High,
        type: FindingType.Info,
      })
    );
    lastReportedMevCountInfo = now;
    lastReportedMevCountHigh = now;
  } else if (
    mevRelaysLength < MEV_RELAY_COUNT_THRESHOLD_INFO &&
    lastReportedMevCountInfo + MEV_RELAY_COUNT_REPORT_WINDOW < now
  ) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ MEV Allow list: Low relay count",
        description: `There are only ${mevRelaysLength} relays in the allowed list.`,
        alertId: "MEV-LOW-RELAY-COUNT",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
    lastReportedMevCountInfo = now;
  }
}

async function handleEnsNamesExpiration(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  if (blockEvent.blockNumber % ENS_CHECK_INTERVAL == 0) {
    const ens = new ethers.Contract(
      ENS_BASE_REGISTRAR_ADDRESS,
      ENS_BASE_REGISTRAR_ABI,
      ethersProvider
    );
    await Promise.all(
      LIDO_ENS_NAMES.map(async (name) => {
        const labelHash = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(name)
        );
        const tokenId = ethers.BigNumber.from(labelHash).toString();
        const expires = new BigNumber(
          String(await ens.functions.nameExpires(tokenId))
        ).toNumber();
        const leftSec = expires - blockEvent.block.timestamp;
        if (leftSec < ONE_MONTH) {
          const left = leftSec > ONE_WEEK * 2 ? "month" : "2 weeks";
          const severity =
            leftSec > ONE_WEEK * 2
              ? FindingSeverity.High
              : FindingSeverity.Critical;
          findings.push(
            Finding.fromObject({
              name: "⚠️ ENS: Domain expires soon",
              description: `Domain rent for ${name}.eth expires in less than a ${left}`,
              alertId: "ENS-RENT-EXPIRES",
              severity: severity,
              type: FindingType.Info,
            })
          );
        }
      })
    );
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (txEvent.to == LIDO_DEPOSIT_SECURITY_ADDRESS) {
    lastDepositorTxTime = txEvent.timestamp;
  }

  for (const eventsOfNotice of [
    DEPOSIT_SECURITY_EVENTS_OF_NOTICE,
    LIDO_EVENTS_OF_NOTICE,
    MEV_ALLOWED_LIST_EVENTS_OF_NOTICE,
    INSURANCE_FUND_EVENTS_OF_NOTICE,
    TRP_EVENTS_OF_NOTICE,
    BURNER_EVENTS_OF_NOTICE,
  ]) {
    handleEventsOfNotice(txEvent, findings, eventsOfNotice);
  }

  return findings;
}

// required for DI to retrieve handlers in the case of direct agent use
exports.default = {
  handleBlock,
  handleTransaction,
  // initialize, // sdk won't provide any arguments to the function
};
