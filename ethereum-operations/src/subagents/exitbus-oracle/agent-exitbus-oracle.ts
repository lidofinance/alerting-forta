import {
  BlockEvent,
  ethers,
  Finding,
  FindingSeverity,
  FindingType,
  LogDescription,
  TransactionEvent,
} from "forta-agent";

import { ethersProvider } from "../../ethers";

import EXITBUS_ORACLE_ABI from "../../abi/ValidatorsExitBusOracle.json";
import LIDO_ABI from "../../abi/Lido.json";
import ORACLE_REPORT_SANITY_CHECKER_ABI from "../../abi/OracleReportSanityChecker.json";
import NODE_OPERATORS_REGISTRY_ABI from "../../abi/NodeOperatorsRegistry.json";

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
let lastMaxValidatorExitRequestsPerReport = 0;

let noNames = new Map<number, string>();

export const name = "ExitBusOracle";

const {
  CL_GENESIS_TIMESTAMP,
  TRIGGER_PERIOD,
  REPORT_CRITICAL_OVERDUE_EVERY_ALERT_NUMBER,
  EXITBUS_ORACLE_ADDRESS,
  LIDO_STETH_ADDRESS,
  WITHDRAWALS_QUEUE_ADDRESS,
  WITHDRAWALS_VAULT_ADDRESS,
  EL_REWARDS_VAULT_ADDRESS,
  MAX_ORACLE_REPORT_SUBMIT_DELAY,
  EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT,
  EXITBUS_ORACLE_PROCESSING_STARTED_EVENT,
  EXITBUS_ORACLE_EVENTS_OF_NOTICE,
  EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_INFO_THRESHOLD,
  EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_MEDIUM_HIGH_THRESHOLD,
  ORACLE_REPORT_SANITY_CHECKER_ADDRESS,
  EXIT_REQUESTS_COUNT_THRESHOLD_PERCENT,
  NODE_OPERATORS_REGISTRY_ADDRESS,
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

  await updateMaxValidatorExitRequestsPerReport(currentBlock);
  await updateNoNames(currentBlock);

  log(
    `lastMaxValidatorExitRequestsPerReport: ${lastMaxValidatorExitRequestsPerReport}`
  );

  return {
    lastReportTimestamp: String(lastReportSubmitTimestamp) ?? "unknown",
    prevReportTimestamp: String(prevReportSubmitTimestamp) ?? "unknown",
    lastMaxValidatorExitRequestsPerReport: String(
      lastMaxValidatorExitRequestsPerReport
    ),
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

async function updateMaxValidatorExitRequestsPerReport(block: number) {
  const sanityChecker = new ethers.Contract(
    ORACLE_REPORT_SANITY_CHECKER_ADDRESS,
    ORACLE_REPORT_SANITY_CHECKER_ABI,
    ethersProvider
  );

  const { maxValidatorExitRequestsPerReport } =
    await sanityChecker.getOracleReportLimits({ blockTag: block });

  lastMaxValidatorExitRequestsPerReport = maxValidatorExitRequestsPerReport;
}

async function updateNoNames(block: number) {
  const nor = new ethers.Contract(
    NODE_OPERATORS_REGISTRY_ADDRESS,
    NODE_OPERATORS_REGISTRY_ABI,
    ethersProvider
  );
  // limit=1000 is times higher than possible number of the NOs in the registry
  const nodeOperatorIDs = await nor.getNodeOperatorIds(0, 1000);
  await Promise.all(
    nodeOperatorIDs.map(async (id: number) => {
      const { name } = await nor.getNodeOperator(id, true);
      noNames.set(Number(id), name);
    })
  );
}

export async function handleBlock(blockEvent: BlockEvent) {
  const findings: Finding[] = [];

  await Promise.all([
    handleReportSubmitted(blockEvent, findings),
    updateMaxValidatorExitRequestsPerReport(blockEvent.blockNumber),
  ]);

  // Update NO names each 100 blocks
  if (blockEvent.blockNumber % 100) {
    await updateNoNames(blockEvent.blockNumber);
  }

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

  handleExitRequest(txEvent, findings);
  handleEventsOfNotice(txEvent, findings, EXITBUS_ORACLE_EVENTS_OF_NOTICE);
  await handleProcessingStarted(txEvent, findings);

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
  const lido = new ethers.Contract(
    LIDO_STETH_ADDRESS,
    LIDO_ABI,
    ethersProvider
  );
  const { refSlot } = processingStarted.args;
  const reportSlotsDiff =
    Math.floor((now - CL_GENESIS_TIMESTAMP) / SECONDS_PER_SLOT) -
    Number(refSlot);
  // it is assumption because we can't get block number by slot number using EL API
  // there are missed slots, so we consider this error in diff to be negligible
  const refBlock = txEvent.blockNumber - reportSlotsDiff;
  const bufferedEth = new BigNumber(
    String(
      await lido.functions.getBufferedEther({
        blockTag: refBlock,
      })
    )
  );
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
  const forFinalization = elVaultBalance
    .plus(withdrawalsVaultBalance)
    .plus(exitRequestsSize)
    .plus(bufferedEth);
  const diffRate = withdrawalsQueueSize.div(forFinalization);
  if (diffRate.gte(EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_MEDIUM_HIGH_THRESHOLD)) {
    if (exitRequestsSize.eq(0)) {
      findings.push(
        Finding.fromObject({
          name: `🚨 ExitBus Oracle: no validators exits in the report, but withdrawal queue was ${diffRate.toFixed(
            2
          )} times bigger than the buffer for requests finalization on reference slot`,
          description: `Validators exits: ${exitRequestsSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nBuffered ethers: ${bufferedEth
            .div(ETH_DECIMALS)
            .toFixed(3)}\nEL vault balance: ${elVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(
              3
            )} ETH\nWithdrawals vault balance: ${withdrawalsVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\n---\nTotal for finalization: ${forFinalization
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nWithdrawal queue size: ${withdrawalsQueueSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH`,
          alertId: "EXITBUS-ORACLE-NO-EXIT-REQUESTS-WHEN-HUGE-QUEUE",
          // todo: should be reconsidered after several exits
          severity: FindingSeverity.Info,
          type: FindingType.Suspicious,
        })
      );
    } else {
      findings.push(
        Finding.fromObject({
          name: `⚠️ ExitBus Oracle: not enough validators exits in the report, withdrawal queue size was ${diffRate.toFixed(
            2
          )} times bigger than the buffer for requests finalization on reference slot`,
          description: `Validators exits: ${exitRequestsSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nBuffered ethers: ${bufferedEth
            .div(ETH_DECIMALS)
            .toFixed(3)}\nEL vault balance: ${elVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(
              3
            )} ETH\nWithdrawals vault balance: ${withdrawalsVaultBalance
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\n---\nTotal for finalization: ${forFinalization
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH\nWithdrawal queue size: ${withdrawalsQueueSize
            .div(ETH_DECIMALS)
            .toFixed(3)} ETH`,
          alertId: "EXITBUS-ORACLE-TOO-LOW-BUFFER-SIZE",
          // todo: should be reconsidered after several exits
          severity: FindingSeverity.Info,
          type: FindingType.Suspicious,
        })
      );
    }
  } else if (diffRate.gte(EXIT_REQUESTS_AND_QUEUE_DIFF_RATE_INFO_THRESHOLD)) {
    findings.push(
      Finding.fromObject({
        name: `🤔️ ExitBus Oracle: not enough validators exits in the report, withdrawal queue size was ${diffRate.toFixed(
          2
        )} times bigger than the buffer for requests finalization on reference slot`,
        description: `Validators exits: ${exitRequestsSize
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH\nBuffered ethers: ${bufferedEth
          .div(ETH_DECIMALS)
          .toFixed(3)}\nEL vault balance: ${elVaultBalance
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH\nWithdrawals vault balance: ${withdrawalsVaultBalance
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH\n---\nTotal for finalization: ${forFinalization
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH\nWithdrawal queue size: ${withdrawalsQueueSize
          .div(ETH_DECIMALS)
          .toFixed(3)} ETH`,
        alertId: "EXITBUS-ORACLE-LOW-BUFFER-SIZE",
        severity: FindingSeverity.Info,
        type: FindingType.Suspicious,
      })
    );
  }
}

function prepareExitsDigest(exitRequests: LogDescription[]): string {
  let digest = new Map<String, Map<String, number>>();
  exitRequests.forEach((request: any) => {
    let args = request.args;
    let nodeOperatorId = Number(args.nodeOperatorId);
    let name = String(args.nodeOperatorId);
    let stakingModuleName = String(args.stakingModuleId);
    if (stakingModuleName == "1") {
      name = noNames.get(nodeOperatorId) || name;
      stakingModuleName = "Curated";
    }
    let moduleDigest =
      digest.get(stakingModuleName) || new Map<string, number>();
    let prevModuleExitsCount = moduleDigest.get(name) || 0;
    moduleDigest.set(name, prevModuleExitsCount + 1);
    digest.set(stakingModuleName, moduleDigest);
  });
  let digestStr = "";
  for (let [moduleName, moduleDigest] of digest.entries()) {
    digestStr += `\n**Module**: ${moduleName}`;
    for (let [name, exitsCount] of moduleDigest.entries()) {
      digestStr += `\n  ${name}:${exitsCount}`;
    }
  }
  return digestStr;
}

function handleExitRequest(txEvent: TransactionEvent, findings: Finding[]) {
  const [processingStarted] = txEvent.filterLog(
    EXITBUS_ORACLE_PROCESSING_STARTED_EVENT,
    EXITBUS_ORACLE_ADDRESS
  );
  if (!processingStarted) {
    return;
  }
  const exitRequests = txEvent.filterLog(
    EXITBUS_ORACLE_VALIDATOR_EXIT_REQUEST_EVENT,
    EXITBUS_ORACLE_ADDRESS
  );
  let digest = "";
  if (exitRequests.length == 0) {
    digest = "No validator exits requested";
  } else {
    digest = prepareExitsDigest(exitRequests);
  }
  findings.push(
    Finding.fromObject({
      name: "ℹ️ ExitBus Oracle: Exit requests digest",
      description: digest,
      alertId: "EXITBUS-ORACLE-EXIT-REQUESTS-DIGEST",
      severity: FindingSeverity.Info,
      type: FindingType.Info,
    })
  );

  if (
    exitRequests.length >
    Math.ceil(
      lastMaxValidatorExitRequestsPerReport *
        EXIT_REQUESTS_COUNT_THRESHOLD_PERCENT
    )
  ) {
    findings.push(
      Finding.fromObject({
        name: "⚠️ ExitBus Oracle: Huge validators exits requests",
        description: `Requested to exit ${exitRequests.length} validators in a single report`,
        alertId: "EXITBUS-ORACLE-HUGE-EXIT-REQUESTS",
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
