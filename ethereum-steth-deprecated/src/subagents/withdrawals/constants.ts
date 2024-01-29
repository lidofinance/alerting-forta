import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { ONE_DAY, ONE_HOUR, ONE_WEEK } from "../../common/constants";
import {
  LIDO_STETH_ADDRESS as lidoStethAddress,
  WITHDRAWAL_QUEUE_ADDRESS as wqAddress,
} from "../../common/constants";

export const WITHDRAWAL_QUEUE_ADDRESS = wqAddress;
export const LIDO_STETH_ADDRESS = lidoStethAddress;

export const BIG_WITHDRAWAL_REQUEST_THRESHOLD = new BigNumber(5000);
export const BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD = new BigNumber(
  150000,
);

export const BIG_UNFINALIZED_QUEUE_THRESHOLD = new BigNumber(100000);
export const BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_DAY;

export const LONG_UNFINALIZED_QUEUE_THRESHOLD = 5 * ONE_DAY;
export const LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_DAY;

export const QUEUE_ON_PAR_STAKE_LIMIT_RATE_THRESHOLD = 0.95;
export const QUEUE_ON_PAR_STAKE_LIMIT_TRIGGER_EVERY = ONE_DAY;

export const UNCLAIMED_REQUESTS_TIME_WINDOW = 2 * ONE_WEEK;
export const UNCLAIMED_REQUESTS_SIZE_RATE_THRESHOLD = 0.2;
export const UNCLAIMED_REQUESTS_SIZE_RATE_TRIGGER_EVERY = ONE_DAY;

export const UNCLAIMED_REQUESTS_MORE_THAN_BALANCE_TRIGGER_EVERY = ONE_DAY;

export const CLAIMED_AMOUNT_MORE_THAN_REQUESTED_MAX_ALERTS_PER_HOUR = 5;

// 20 minutes
export const BLOCK_CHECK_INTERVAL = 100;

export const MAX_REQUESTS_CHUNK_SIZE = 25;

export const LIDO_TOKEN_REBASED =
  "event TokenRebased(uint256 indexed reportTimestamp, uint256 timeElapsed, uint256 preTotalShares, uint256 preTotalEther, uint256 postTotalShares, uint256 postTotalEther, uint256 sharesMintedAsFees)";

export const WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED =
  "event WithdrawalRequested(uint256 indexed requestId, address indexed requestor, address indexed owner, uint256 amountOfStETH, uint256 amountOfShares)";
export const WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED =
  "event WithdrawalsFinalized(uint256 indexed from, uint256 indexed to, uint256 amountOfETHLocked, uint256 sharesToBurn, uint256 timestamp)";
export const WITHDRAWAL_QUEUE_WITHDRAWAL_CLAIMED =
  "event WithdrawalClaimed(uint256 indexed requestId, address indexed owner, address indexed receiver, uint256 amountOfETH)";

export const WITHDRAWALS_BUNKER_MODE_ENABLED =
  "event BunkerModeEnabled(uint256 _sinceTimestamp)";
export const WITHDRAWALS_BUNKER_MODE_DISABLED = "event BunkerModeDisabled()";

export const WITHDRAWALS_EVENTS_OF_NOTICE = [
  {
    address: WITHDRAWAL_QUEUE_ADDRESS,
    event: "event Resumed()",
    alertId: "WITHDRAWALS-UNPAUSED",
    name: "✅ Withdrawals: contract was unpaused",
    description: (args: any) => "Contract was resumed",
    severity: FindingSeverity.High,
  },
  {
    address: WITHDRAWAL_QUEUE_ADDRESS,
    event: "event Paused(uint256 duration)",
    alertId: "WITHDRAWALS-PAUSED",
    name: "🚨 Withdrawals: contract was paused",
    description: (args: any) =>
      `For ${new BigNumber(args.duration).div(ONE_HOUR)} hours`,
    severity: FindingSeverity.Critical,
  },
];
