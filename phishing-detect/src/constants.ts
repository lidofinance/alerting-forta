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
  // owned by Lido
  curvePool: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  balancerPool: "0x32296969ef14eb0c6d29669c550d4a0449130230",
  oneInchPool: "0xc1a900ae76db21dc5aa8e418ac0f4e888a4c7431",
  sushiPool: "0xc5578194d457dcce3f272538d1ad52c68d1ce849",
  wstETH: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
  // externally owned
  aaveLandingPoolV2: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
  oneInchV4Router: "0x1111111254fb6c44bac0bed2854e76f90643097d",
  metamaskSwapRouter: "0x881d40237659c251811cec9c364ef91dc08d300c",
  paraswapV5TokenTransferProxyMainnet:
    "0x216b4b4ba9f3e719726886d34a177484278bfcae",
  sushiSwapRouter: "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f",
  anchorVault: "0xa2f987a546d4cd1c607ee8141276876c26b72bdf",
  uniswapV3Router2: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
  uniswapV3Router: "0xe592427a0aece92de3edee1f18e0157c05861564",
  uniswapV2Router2: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  uniswapV3PositionsNFT: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
  zeroXExchangeProxy: "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
  balancerVault: "0xba12222222228d8ba445958a75a0704d566bf2c8",
  oneInchV3: "0x11111112542d85b3ef69ae05771c2dccff4faa26",
  coWProtocolGPv2VaultRelayer: "0xc92e8bdf79f0507f65a392b0ab4667716bfe0110",
  curveRETHtoWstETH: "0x447Ddd4960d9fdBF6af9a790560d0AF76795CB08",
  zapperZap: "0x8e52522e6a77578904ddd7f528a22521dc4154f5",
  wormholeTokenBridge: "0x3ee18b2214aff97000d974cf647e7c347e8fa585",
  ribbonFinanceStETHCoveredCallVault: "0x53773e034d9784153471813dacaff53dbbb78e8c",
  DODOApproveV2: "0xcb859ea579b28e02b87a1fde08d087ab9dbe5149",
  mooniswap: "0x1f629794b34ffb3b29ff206be5478a52678b47ae",
};

export const APPROVE_FUNCTION_ABI =
  "function approve(address spender, uint256 amount)";
export const INCREASE_ALLOWANCE_ABI =
  "function increaseAllowance(address spender, uint256 addedValue)";
