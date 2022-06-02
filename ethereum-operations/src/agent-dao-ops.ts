import BigNumber from "bignumber.js";

import {
  ethers,
  BlockEvent,
  TransactionEvent,
  Finding,
  FindingType,
  FindingSeverity,
} from "forta-agent";

import { ethersProvider, etherscanProvider } from "./ethers";

import NODE_OPERATORS_REGISTRY_ABI from "./abi/NodeOperatorsRegistry.json";
import LIDO_DAO_ABI from "./abi/LidoDAO.json";

import {
  NODE_OPERATORS_REGISTRY_ADDRESS,
  LIDO_DAO_ADDRESS,
  MIN_AVAILABLE_KEYS_COUNT,
  MAX_BUFFERED_ETH_AMOUNT_CRITICAL,
  MAX_BUFFERED_ETH_AMOUNT_MEDIUM,
  ETH_DECIMALS,
  LIDO_DEPOSIT_SECURITY_ADDRESS,
  MAX_DEPOSITOR_TX_DELAY,
  MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME,
  LIDO_DEPOSIT_EXECUTOR_ADDRESS,
  MIN_DEPOSIT_EXECUTOR_BALANCE,
  DEPOSIT_SECURITY_EVENTS_OF_NOTICE,
  LIDO_DAO_EVENTS_OF_NOTICE,
} from "./constants";

export const name = "DaoOps";

// 24 hours
const REPORT_WINDOW = 60 * 60 * 24;
// 4 hours
const REPORT_WINDOW_EXECUTOR_BALANCE = 60 * 60 * 4;
// 12 hours
const REPORT_WINDOW_STAKING_LIMIT_30 = 60 * 60 * 12;
// 12 hours
const REPORT_WINDOW_STAKING_LIMIT_10 = 60 * 60 * 12;
let lastReportedKeysShortage = 0;
let lastReportedBufferedEth = 0;
let lastDepositorTxTime = 0;
let criticalBufferAmountFrom = 0;
let lastReportedExecutorBalance = 0;
let lastReportedStakingLimit10 = 0;
let lastReportedStakingLimit30 = 0;

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
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleNodeOperatorsKeys(blockEvent, findings),
    handleBufferedEth(blockEvent, findings),
    handleDepositExecutorBalance(blockEvent, findings),
    handleStakingLimit(blockEvent, findings),
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
      await nodeOperatorsRegistry.functions.getActiveNodeOperatorsCount();
    let availableKeys: Promise<any>[] = [];
    let availableKeysCount = 0;
    for (let i = 0; i < nodeOperatorsCount; i++) {
      availableKeys.push(
        nodeOperatorsRegistry.functions
          .getUnusedSigningKeyCount(i)
          .then((value) => (availableKeysCount += parseInt(String(value))))
      );
    }
    await Promise.all(availableKeys);
    if (availableKeysCount < MIN_AVAILABLE_KEYS_COUNT) {
      findings.push(
        Finding.fromObject({
          name: "Few available keys count",
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
  const now = blockEvent.block.timestamp;
  const lidoDao = new ethers.Contract(
    LIDO_DAO_ADDRESS,
    LIDO_DAO_ABI,
    ethersProvider
  );
  const bufferedEthRaw = new BigNumber(
    String(
      await lidoDao.functions.getBufferedEther({
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
          name: "Huge buffered ETH amount",
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
          name: "High buffered ETH amount",
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
}

async function handleDepositExecutorBalance(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  if (lastReportedExecutorBalance + REPORT_WINDOW_EXECUTOR_BALANCE < now) {
    const executorBalanceRaw = new BigNumber(
      String(await ethersProvider.getBalance(LIDO_DEPOSIT_EXECUTOR_ADDRESS))
    );
    const executorBalance = executorBalanceRaw.div(ETH_DECIMALS).toNumber();
    if (executorBalance < MIN_DEPOSIT_EXECUTOR_BALANCE) {
      findings.push(
        Finding.fromObject({
          name: "Low deposit executor balance",
          description:
            `Balance of deposit executor is ${executorBalance.toFixed(4)}. ` +
            `This is extremely low!`,
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
  const now = blockEvent.block.timestamp;
  const lidoDao = new ethers.Contract(
    LIDO_DAO_ADDRESS,
    LIDO_DAO_ABI,
    ethersProvider
  );
  const stakingLimitInfo = await lidoDao.functions.getStakeLimitFullInfo({
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
        name: "Staking limit below 10%",
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
        name: "Staking limit below 30%",
        description:
          `Current staking limit is ${currentStakingLimit.toFixed(2)} ETH ` +
          `this is lower than 10% of max staking limit ` +
          `${maxStakingLimit.toFixed(2)} ETH`,
        alertId: "LOW-STAKING-LIMIT",
        severity: FindingSeverity.Info,
        type: FindingType.Info,
      })
    );
    lastReportedStakingLimit30 = now;
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  handleDepositorTx(txEvent, findings);
  handleLidoDAOTx(txEvent, findings);

  return findings;
}

function handleDepositorTx(txEvent: TransactionEvent, findings: Finding[]) {
  if (txEvent.to == LIDO_DEPOSIT_SECURITY_ADDRESS) {
    lastDepositorTxTime = txEvent.timestamp;
  }
  DEPOSIT_SECURITY_EVENTS_OF_NOTICE.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
        );
      });
    }
  });
}

function handleLidoDAOTx(txEvent: TransactionEvent, findings: Finding[]) {
  LIDO_DAO_EVENTS_OF_NOTICE.forEach((eventInfo) => {
    if (eventInfo.address in txEvent.addresses) {
      const events = txEvent.filterLog(eventInfo.event, eventInfo.address);
      events.forEach((event) => {
        findings.push(
          Finding.fromObject({
            name: eventInfo.name,
            description: eventInfo.description(event.args),
            alertId: eventInfo.alertId,
            severity: eventInfo.severity,
            type: FindingType.Info,
            metadata: { args: String(event.args) },
          })
        );
      });
    }
  });
}
