import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  TransactionEvent,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import EXITBUS_ORACLE_ABI from "../../abi/ValidatorsExitBusOracle.json";

import {
  formatDelay,
  handleEventsOfNotice,
  RedefineMode,
  requireWithTier,
} from "../../common/utils";
import type * as Constants from "./constants";
import {
  ETH_DECIMALS,
  MIN_DEPOSIT,
  ONE_HOUR,
  SECONDS_PER_SLOT,
} from "../../common/constants";
import BigNumber from "bignumber.js";
import WITHDRAWAL_QUEUE_ABI from "../../abi/WithdrawalQueueERC721.json";

// re-fetched from history on startup
let lastReportSubmitTimestamp = 0;
let lastReportSubmitOverdueTimestamp = 0;

let reportSubmitOverdueCount = 0;

export const name = "ExitBusOracle";

const {
  CL_GENESIS_TIMESTEMP,
  TRIGGER_PERIOD,
  REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER,
  EXITBUS_ORACLE_ADDRESS,
  WITHDRAWALS_QUEUE_ADDRESS,
  WITHDRAWALS_VAULT_ADDRESS,
  EL_REWARDS_VAULT_ADDRESS,
  MAX_ORACLE_REPORT_SUBMIT_DELAY,
  EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT,
  EXITBUS_ORACLE_PROCESSING_STARTED_EVENT,
  EXITBUS_ORACLE_EVENTS_OF_NOTICE,
  EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_INFO_THRESHOLD,
  EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_MEDIUM_HIGH_THRESHOLD,
} = requireWithTier<typeof Constants>(
  module,
  `./constants`,
  RedefineMode.Merge
);

const log = (text: string) => console.log(`[${name}] ${text}`);

export async function initialize(
  currentBlock: number
): Promise<{ [key: string]: string }> {
  console.log(`[${name}]`);

  const block48HoursAgo =
    currentBlock - Math.ceil((48 * ONE_HOUR) / SECONDS_PER_SLOT);

  const reportSubmits = await getReportSubmits(
    block48HoursAgo,
    currentBlock - 1
  );
  let prevReportSubmitTimestamp = 0;
  if (reportSubmits.length > 1) {
    prevReportSubmitTimestamp = (
      await reportSubmits[reportSubmits.length - 2].getBlock()
    ).timestamp;
  }
  if (reportSubmits.length > 0) {
    lastReportSubmitTimestamp = (
      await reportSubmits[reportSubmits.length - 1].getBlock()
    ).timestamp;
  }

  log(
    `Prev report submit: ${new Date(
      prevReportSubmitTimestamp * 1000
    ).toUTCString()}`
  );
  log(
    `Last report submit: ${new Date(
      lastReportSubmitTimestamp * 1000
    ).toUTCString()}`
  );

  return {
    lastReportTimestamp: String(lastReportSubmitTimestamp) ?? "unknown",
    prevReportTimestamp: String(prevReportSubmitTimestamp) ?? "unknown",
  };
}

async function getReportSubmits(blockFrom: number, blockTo: number) {
  const exitbusOracle = new ethers.Contract(
    EXITBUS_ORACLE_ADDRESS,
    EXITBUS_ORACLE_ABI,
    ethersProvider
  );

  const oracleReportFilter = exitbusOracle.filters.ReportSubmitted();

  return await exitbusOracle.queryFilter(
    oracleReportFilter,
    blockFrom,
    blockTo
  );
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([handleReportSubmitted(blockEvent, findings)]);

  return findings;
}

async function handleReportSubmitted(
  blockEvent: BlockEvent,
  findings: Finding[]
) {
  const now = blockEvent.block.timestamp;
  const reportSubmitDelay =
    now - (lastReportSubmitTimestamp ? lastReportSubmitTimestamp : 0);

  if (
    reportSubmitDelay > MAX_ORACLE_REPORT_SUBMIT_DELAY &&
    now - lastReportSubmitOverdueTimestamp >= TRIGGER_PERIOD
  ) {
    // fetch events history 1 more time to be sure that there were actually no reports during last 25 hours
    // needed to handle situation with the missed TX with prev report
    const reportSubmits = await getReportSubmits(
      blockEvent.blockNumber - Math.ceil((24 * ONE_HOUR) / SECONDS_PER_SLOT),
      blockEvent.blockNumber - 1
    );
    if (reportSubmits.length > 0) {
      lastReportSubmitTimestamp = (
        await reportSubmits[reportSubmits.length - 1].getBlock()
      ).timestamp;
    }
    const reportSubmitDelayUpdated =
      now - (lastReportSubmitTimestamp ? lastReportSubmitTimestamp : 0);
    if (reportSubmitDelayUpdated > MAX_ORACLE_REPORT_SUBMIT_DELAY) {
      const severity =
        reportSubmitOverdueCount % REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER ==
        0
          ? FindingSeverity.Critical
          : FindingSeverity.High;
      findings.push(
        Finding.fromObject({
          name: "🚨 ExitBus Oracle: report submit overdue",
          description: `Time since last report: ${formatDelay(
            reportSubmitDelayUpdated
          )}`,
          alertId: "EXITBUS-ORACLE-OVERDUE",
          severity: severity,
          type: FindingType.Degraded,
          metadata: {
            delay: `${reportSubmitDelayUpdated}`,
          },
        })
      );
      lastReportSubmitOverdueTimestamp = now;
      reportSubmitOverdueCount += 1;
    }
  }
}

export async function handleTransaction(txEvent: TransactionEvent) {
  const findings: Finding[] = [];

  if (txEvent.to == EXITBUS_ORACLE_ADDRESS) {
    await handleProcessingStarted(txEvent, findings);
    await handleExitRequest(txEvent, findings);
  }

  handleEventsOfNotice(txEvent, findings, EXITBUS_ORACLE_EVENTS_OF_NOTICE);

  return findings;
}

async function handleProcessingStarted(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const [processingStarted] = txEvent.filterLog(
    EXITBUS_ORACLE_PROCESSING_STARTED_EVENT,
    EXITBUS_ORACLE_ADDRESS
  );
  if (!processingStarted) return;
  const now = txEvent.timestamp;
  const exitRequests = txEvent.filterLog(
    EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT,
    EXITBUS_ORACLE_ADDRESS
  );
  const exitRequestsSize = MIN_DEPOSIT.times(exitRequests.length);
  const withdrawalNFT = new ethers.Contract(
    WITHDRAWALS_QUEUE_ADDRESS,
    WITHDRAWAL_QUEUE_ABI,
    ethersProvider
  );
  const { refSlot } = processingStarted.args;
  const reportSlotsDiff =
    Math.floor((now - CL_GENESIS_TIMESTEMP) / SECONDS_PER_SLOT) -
    Number(refSlot);
  // it is assumption because we can't get block number by slot number using EL API
  // there are missed slots, so we consider this error in diff to be negligible
  const refBlock = txEvent.blockNumber - reportSlotsDiff;
  const elVaultBalance = new BigNumber(
    String(await ethersProvider.getBalance(EL_REWARDS_VAULT_ADDRESS, refBlock))
  );
  const withdrawalsVaultBalance = new BigNumber(
    String(await ethersProvider.getBalance(WITHDRAWALS_VAULT_ADDRESS, refBlock))
  );
  const withdrawalsQueueSize = new BigNumber(
    String(
      await withdrawalNFT.functions.unfinalizedStETH({
        blockTag: refBlock,
      })
    )
  );
  const diffRate = withdrawalsQueueSize.div(
    elVaultBalance.plus(withdrawalsVaultBalance).plus(exitRequestsSize)
  );
  if (diffRate.gte(EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_MEDIUM_HIGH_THRESHOLD)) {
    if (withdrawalsQueueSize.eq(0)) {
      findings.push(
        Finding.fromObject({
          name: `🚨 ExitBus Oracle: withdrawal queue is x${diffRate.toFixed(
            2
          )} bigger than current buffer for requests finalization, but no one request to exit`,
          description: `Withdrawal queue size: ${withdrawalsQueueSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nExit requests size: ${exitRequestsSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nEL vault balance: ${elVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(
              3
            )} ETH\nWithdrawals vault balance: ${withdrawalsVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH`,
          alertId: "EXITBUS-ORACLE-NO-EXIT-REQUESTS-WHEN-HUGE-QUEUE",
          severity: FindingSeverity.High,
          type: FindingType.Suspicious,
        })
      );
    } else {
      findings.push(
        Finding.fromObject({
          name: `⚠️ ExitBus Oracle: withdrawal queue size is ${diffRate.toFixed(
            2
          )} times bigger than the current buffer for requests finalization`,
          description: `Withdrawal queue size: ${withdrawalsQueueSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nExit requests size: ${exitRequestsSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nEL vault balance: ${elVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(
              3
            )} ETH\nWithdrawals vault balance: ${withdrawalsVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH`,
          alertId: "EXITBUS-ORACLE-TOO-LOW-BUFFER-SIZE",
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
        })
      );
    }
  } else if (diffRate.gte(EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_INFO_THRESHOLD)) {
    findings.push(
      Finding.fromObject({
        name: `🤔️ ExitBus Oracle: withdrawal queue size is ${diffRate.toFixed(
          2
        )} times bigger than the current buffer for requests finalization`,
        description: `Withdrawal queue size: ${withdrawalsQueueSize
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH\nExit requests size: ${exitRequestsSize
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH\nEL vault balance: ${elVaultBalance
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH\nWithdrawals vault balance: ${withdrawalsVaultBalance
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH`,
        alertId: "EXITBUS-ORACLE-LOW-BUFFER-SIZE",
        severity: FindingSeverity.Info,
        type: FindingType.Suspicious,
      })
    );
  }
}

async function handleExitRequest(
  txEvent: TransactionEvent,
  findings: Finding[]
) {
  const exitRequests = txEvent.filterLog(
    EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT,
    EXITBUS_ORACLE_ADDRESS
  );
  if (!exitRequests) return;
  if (exitRequests.length > 1000) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ ExitBus Oracle: requested to exit more than 1000 validators",
        description: `Requested to exit ${exitRequests.length} validators in a single report`,
        alertId: "EXITBUS-ORACLE-MANY-EXIT-REQUESTS",
        severity: FindingSeverity.High,
        type: FindingType.Suspicious,
      })
    );
  } else if (exitRequests.length > 100) {
    findings.push(
      Finding.fromObject({
        name: "ℹ️ ExitBus Oracle: requested to exit more than 100 validators",
        description: `Requested to exit ${exitRequests.length} validators in a single report`,
        alertId: "EXITBUS-ORACLE-MANY-EXIT-REQUESTS",
        severity: FindingSeverity.Info,
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
