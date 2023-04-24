import BigNumber from "bignumber.js";
import { ONE_HOUR } from "../../common/constants";

export const WITHDRAWAL_QUEUE_ADDRESS =
  "0xcf117961421ca9e546cd7f50bc73abcdb3039533";
export const LIDO_ADDRESS = "0x1643e812ae58766192cf7d2cf9567df2c37e9b7f";

export const BIG_WITHDRAWAL_REQUEST_THRESHOLD = new BigNumber(0.1);
export const BIG_WITHDRAWAL_REQUEST_AFTER_REBASE_THRESHOLD = new BigNumber(1);
export const BIG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_HOUR;

export const BIG_UNFINALIZED_QUEUE_THRESHOLD = new BigNumber(5);
export const LONG_UNFINALIZED_QUEUE_THRESHOLD = ONE_HOUR;
export const LONG_UNFINALIZED_QUEUE_TRIGGER_EVERY = ONE_HOUR;
