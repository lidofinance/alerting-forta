import BigNumber from "bignumber.js";
import { FindingSeverity } from "forta-agent";

// COMMON CONSTS

// 1 ETH
export const ETH_DECIMALS = new BigNumber(10).pow(18);
// 1 gwei
export const GWEI_DECIMALS = new BigNumber(10).pow(9);

// 1 hour
export const ONE_HOUR = 60 * 60;

// ADDRESSES AND EVENTS
export const ANCHOR_VAULT_ADDRESS =
  "0xa2f987a546d4cd1c607ee8141276876c26b72bdf";
export const ANCHOR_VAULT_REWARDS_COLLECTED_EVENT =
  "event RewardsCollected(uint256 steth_amount, uint256 ust_amount)";
export const ANCHOR_REWARDS_LIQ_SOLD_STETH_EVENT =
  "event SoldStethToUST(uint256 steth_amount, uint256 eth_amount, uint256 usdc_amount, uint256 ust_amount, uint256 steth_eth_price, uint256 eth_usdc_price, uint256 usdc_ust_price)";
// 0.3 ETH
export const MIN_REWARDS_LIQUIDATOR_ADMIN_BALANCE = new BigNumber(0.05).times(
  ETH_DECIMALS
);
// 4 hours
export const BALANCE_REPORT_WINDOW = 60 * 60 * 4;

export const AAVE_ASTETH_ADDRESS = "0x1982b2f5814301d4e9a8b0201555376e62f82428";
export const AAVE_STABLE_DEBT_STETH_ADDRESS =
  "0x66457616dd8489df5d0afd8678f4a260088aaf55";
export const AAVE_VARIABLE_DEBT_STETH_ADDRESS =
  "0xa9deac9f00dc4310c35603fcd9d34d1a750f81db";

export const DWSTETH_TOKEN_ADDRESS =
  "0x436548baab5ec4d79f669d1b9506d67e98927af7";
export const TRANSFER_EVENT =
  "event Transfer(address indexed _from, address indexed _to, uint256 _value)";

export const LIDO_DAO_ADDRESS = "0xae7ab96520de3a18e5e111b5eaab095312d7fe84";
export const LDO_TOKEN_ADDRESS = "0x5a98fcbea516cf06857215779fd812ca3bef1b32";
export const LIDO_ORACLE_ADDRESS = "0x442af784a788a5bd6f42a01ebe9f287a871243fb";
export const LIDO_ORACLE_COMPLETED_EVENT =
  "event Completed(uint256 epochId, uint128 beaconBalance, uint128 beaconValidators)";

// trigger each 5 minutes for lasting conditions
export const TRIGGER_PERIOD = 60 * 5;

// max delay between oracle report and bETH rewards sell
export const MAX_BETH_REWARDS_SELL_DELAY = 60 * 5; // 5 minutes

// max delay of receipt of funds for pool rewards manager contract
export const MAX_DELAY_OF_POOL_REWARDS_PERIOD_PROLONGATION = 10 * 60; // 10 mins

// rewardsAddress is needed only if manager contract doesn't have `period_finish` function
export const POOLS_PARAMS = {
  Curve: {
    managerAddress: "0x753d5167c31fbeb5b49624314d74a957eb271709",
    rewardsAddress: "0x99ac10631f69c753ddb595d074422a0922d9056b",
    poolContractAddress: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  },
  Balancer: {
    managerAddress: "0x86f6c353a0965eb069cd7f4f91c1afef8c725551",
    rewardsAddress: "",
  },
};

export const POOLS_PARAMS_BALANCES = {
  Curve: {
    managerAddress: "0x753d5167c31fbeb5b49624314d74a957eb271709",
    rewardsAddress: "0x99ac10631f69c753ddb595d074422a0922d9056b",
    poolContractAddress: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  },
  CurveWethStEth: {
    rewardsAddress: "0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0",
    poolContractAddress: "0x828b154032950c8ff7cf8085d841723db2696056",
  },
  Balancer: {
    managerAddress: "0x86f6c353a0965eb069cd7f4f91c1afef8c725551",
    rewardsAddress: "",
    vaultContractAddress: "0xba12222222228d8ba445958a75a0704d566bf2c8",
    poolId:
      "0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080",
  },
};

const period10days = 10 * 24 * 60 * 60;
const period5days = 5 * 24 * 60 * 60;
const period3days = 3 * 24 * 60 * 60;
const period2days = 2 * 24 * 60 * 60;

// Must be sorted by period ascending
export const POOL_REWARDS_ALERTS_PERIODS_PARAMS = [
  {
    period: period2days,
    minManagerLdoBalance: "10000",
    description: (poolName: string) =>
      `${poolName} rewards period expires in 2 days and LDO balance is under 10,000 LDO`,
    severity: FindingSeverity.High,
    pools: ["Curve"],
  },
  {
    period: period3days,
    minManagerLdoBalance: "0",
    description: (poolName: string) =>
      `${poolName} rewards period expires in 3 days`,
    severity: FindingSeverity.High,
    pools: ["Curve"],
  },
  {
    period: period5days,
    minManagerLdoBalance: null,
    description: (poolName: string) =>
      `${poolName} rewards period expires in 5 days`,
    severity: FindingSeverity.Info,
    pools: ["Curve"],
  },
  {
    period: period10days,
    minManagerLdoBalance: null,
    description: (poolName: string) =>
      `${poolName} rewards period expires in 10 days`,
    severity: FindingSeverity.Info,
    pools: ["Curve"],
  },
];

// 1 gwe1
export const ASTETH_GWEI_DIFFERENCE_THRESHOLD = GWEI_DECIMALS.times(1);

// all consts in the block bellow are in percents
export const IMBALANCE_TOLERANCE = 10;
export const IMBALANCE_CHANGE_TOLERANCE = 10;
export const POOL_SIZE_CHANGE_TOLERANCE_INFO = 5;
export const POOL_SIZE_CHANGE_TOLERANCE_HIGH = 10;
export const TOTAL_UNSTAKED_STETH_TOLERANCE = 10;

//! Don't report if time passed since report moment is greater than REPORT_WINDOW
export const POOLS_BALANCES_REPORT_WINDOW = 60 * 60 * 24 * 7; // 1 week

export const PEG_REPORT_INTERVAL = 60 * 60 * 24; // 24 hours
export const PEG_STEP_ALERT_MIN_VALUE = 0.98;
export const PEG_STEP = 0.01;
export const PEG_THRESHOLD = 0.9;
