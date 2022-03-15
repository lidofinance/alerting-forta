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
} from "./constants";

export const name = "DaoOps";

// 24 hours
const REPORT_WINDOW = 60 * 60 * 24;
// 4 hours
const REPORT_WINDOW_EXECUTOR_BALANCE = 60 * 60 * 4;
let lastReportedKeysShortage = 0;
let lastReportedBufferedEth = 0;
let lastDepositorTxTime = 0;
let criticalBufferAmountFrom = 0;
let lastReportedExecutorBalance = 0;

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);
  let provider = new ethers.providers.EtherscanProvider();
  let history = await provider.getHistory(LIDO_DEPOSIT_SECURITY_ADDRESS, currentBlock - Math.floor(60 * 60 * 72 / 13), currentBlock - 1);
  const depositorTxTimestamps = history.map(x => x.timestamp ? x.timestamp : 0);
  if (depositorTxTimestamps.length > 0) {
    depositorTxTimestamps.sort((a,b) => a - b)
    lastDepositorTxTime = depositorTxTimestamps[0]
  }
  console.log(`[${name}] lastDepositorTxTime=${lastDepositorTxTime}`)
  return {};
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleNodeOperatorsKeys(blockEvent, findings),
    handleBufferedEth(blockEvent, findings),
    handleDepositExecutorBalance(blockEvent, findings),
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
    String(await lidoDao.functions.getBufferedEther({blockTag:blockEvent.block.number}))
  );
  const bufferedEth = bufferedEthRaw.div(ETH_DECIMALS).toNumber();
  // Keep track of buffer size above MAX_BUFFERED_ETH_AMOUNT_CRITICAL
  if (bufferedEth > MAX_BUFFERED_ETH_AMOUNT_CRITICAL) {
    criticalBufferAmountFrom = criticalBufferAmountFrom != 0 ? criticalBufferAmountFrom : now
  } else {
    // reset counter if buffered amount goes below MAX_BUFFERED_ETH_AMOUNT_CRITICAL
    criticalBufferAmountFrom = 0;
  }
  if (lastReportedBufferedEth + REPORT_WINDOW < now) {
    if (bufferedEth > MAX_BUFFERED_ETH_AMOUNT_CRITICAL && criticalBufferAmountFrom < now - MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME) {
      findings.push(
        Finding.fromObject({
          name: "Huge buffered ETH amount",
          description: `There are ${bufferedEth.toFixed(4)} buffered ETH in DAO for more than ${Math.floor(MAX_BUFFERED_ETH_AMOUNT_CRITICAL_TIME / ( 60 * 60 ))} hour(s)`,
          alertId: "HUGE-BUFFERED-ETH",
          severity: FindingSeverity.High,
          type: FindingType.Degraded,
        })
      );
      lastReportedBufferedEth = now
    } else if (bufferedEth > MAX_BUFFERED_ETH_AMOUNT_MEDIUM && lastDepositorTxTime < now - MAX_DEPOSITOR_TX_DELAY && lastDepositorTxTime !== 0) {
      findings.push(
        Finding.fromObject({
          name: "High buffered ETH amount",
          description: `There are ${bufferedEth.toFixed(4)} buffered ETH in DAO and there are more than ${Math.floor(MAX_DEPOSITOR_TX_DELAY / ( 60 * 60 ))} hours since last Depositor TX`,
          alertId: "HIGH-BUFFERED-ETH",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
      lastReportedBufferedEth = now
    }
  }
}


async function handleDepositExecutorBalance(blockEvent: BlockEvent, findings: Finding[]) {
  const now = blockEvent.block.timestamp;
  if (lastReportedExecutorBalance + REPORT_WINDOW_EXECUTOR_BALANCE < now) {
    const executorBalanceRaw = new BigNumber(String(await ethersProvider.getBalance(LIDO_DEPOSIT_EXECUTOR_ADDRESS)))
    const executorBalance = executorBalanceRaw.div(ETH_DECIMALS).toNumber();
    if (executorBalance < MIN_DEPOSIT_EXECUTOR_BALANCE) {
      findings.push(
        Finding.fromObject({
          name: "Low deposit executor balance",
          description: `Balance of deposit executor is ${executorBalance.toFixed(4)}. This is extremely low!`,
          alertId: "LOW-DEPOSIT-EXECUTOR-BALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
      lastReportedExecutorBalance = now
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = []

  handleDepositorTx(txEvent, findings)

  return findings
}

function handleDepositorTx(txEvent: TransactionEvent, findings: Finding[]) {
  if (txEvent.to == LIDO_DEPOSIT_SECURITY_ADDRESS) {
    lastDepositorTxTime = txEvent.timestamp
  }
}