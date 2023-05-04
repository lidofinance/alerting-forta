import { FindingSeverity } from "forta-agent";
import BigNumber from "bignumber.js";
import { ONE_DAY, ONE_HOUR } from "../../common/constants";

export const WITHDRAWAL_QUEUE_ADDRESS =
  "0x889edc2edab5f40e902b864ad4d7ade8e412f9b1";
export const LIDO_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";

export const BIG_WITHDRAWAL_REQUEST_THRESHOLD = new BigNumber(50000);
export const BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD = new BigNumber(
  150000
);

export const BIG_UNFINALIZED_QUEUE_THRESHOLD = new BigNumber(100000);
export const BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_DAY;

export const LONG_UNFINALIZED_QUEUE_THRESHOLD = 5 * ONE_DAY;
export const LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_DAY;

export const LIDO_TOKEN_REBASED =
  "event TokenRebased(uint256 indexed reportTimestamp, uint256 timeElapsed, uint256 preTotalShares, uint256 preTotalEther, uint256 postTotalShares, uint256 postTotalEther, uint256 sharesMintedAsFees)";

export const WITHDRAWAL_QUEUE_WITHDRAWAL_REQUESTED =
  "event WithdrawalRequested(uint256 indexed requestId, address indexed requestor, address indexed owner, uint256 amountOfStETH, uint256 amountOfShares)";
export const WITHDRAWAL_QUEUE_WITHDRAWALS_FINALIZED =
  "event WithdrawalsFinalized(uint256 indexed from, uint256 indexed to, uint256 amountOfETHLocked, uint256 sharesToBurn, uint256 timestamp)";

export const WITHDRAWALS_BUNKER_MODE_ENABLED =
  "event BunkerModeEnabled(uint256 _sinceTimestamp)";
export const WITHDRAWALS_BUNKER_MODE_DISABLED = "event BunkerModeDisabled()";

export const WITHDRAWALS_EVENTS_OF_NOTICE = [
  {
    address: WITHDRAWAL_QUEUE_ADDRESS,
    event: "event Resumed()",
    alertId: "WITHDRAWALS-UNPAUSED",
    name: "ℹ️ Withdrawals: contract was unpaused",
    description: (args: any) => "",
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
