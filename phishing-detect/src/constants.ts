import BigNumber from "bignumber.js";
import { FindingSeverity } from "forta-agent";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);
// 1 LDO
export const LDO_DECIMALS = new BigNumber(10).pow(18);

// alert if more than 2 token types delegated to non-whitelist address
export const UNIQ_TOKENS_THRESHOLD = 2;
// alert again if more than 1 additional token type added to delegated to non-whitelist address
export const UNIQ_TOKENS_CHANGE_THRESHOLD = 1;
// alert if more than 10 addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_THRESHOLD = 10;
// alert again if more than 10 additional addresses delegated their tokens to non-whitelist address
export const UNIQ_DELEGATES_CHANGE_THRESHOLD = 10;

// set alert reproduction frequency to 7 days
// alert can be produced earlier only if UNIQ_TOKENS_CHANGE_THRESHOLD and UNIQ_DELEGATES_CHANGE_THRESHOLD thresholds are reached
export const ALERT_SILENCE_PERIOD = 60 * 60 * 24 * 7;

// ADDRESSES, EVENTS, ABIs

export const MONITORED_ERC20_ADDRESSES = new Map<string, string>([
  ["0x5a98fcbea516cf06857215779fd812ca3bef1b32", "LDO"],
  ["0xae7ab96520de3a18e5e111b5eaab095312d7fe84", "stETH"],
  ["0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0", "wstETH"],
  ["0x707f9118e33a9b8998bea41dd0d46f38bb963fc8", "bETH"],
  ["0x1982b2f5814301d4e9a8b0201555376e62f82428", "astETH"],
]);

export const WHITE_LIST_ADDRESSES = {
  curvePool: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  balancerPool: "0x32296969ef14eb0c6d29669c550d4a0449130230",
  oneInchPool: "0xc1a900ae76db21dc5aa8e418ac0f4e888a4c7431",
  sushiPool: "0xc5578194d457dcce3f272538d1ad52c68d1ce849",
  aaveLandingPoolV2: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
};

export const APPROVE_FUNCTION_ABI =
  "function approve(address spender, uint256 amount)";
export const INCREASE_ALLOWANCE_ABI =
  "function increaseAllowance(address spender, uint256 addedValue)";
