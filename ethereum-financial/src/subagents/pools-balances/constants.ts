export const POOLS_PARAMS_BALANCES = {
  Curve: {
    managerAddress: "0x753d5167c31fbeb5b49624314d74a957eb271709",
    rewardsAddress: "0x99ac10631f69c753ddb595d074422a0922d9056b",
    poolContractAddress: "0xdc24316b9ae028f1497c275eb9192a3ea0f67022",
  },
  Balancer: {
    managerAddress: "0x86f6c353a0965eb069cd7f4f91c1afef8c725551",
    rewardsAddress: "",
    vaultContractAddress: "0xba12222222228d8ba445958a75a0704d566bf2c8",
    poolId:
      "0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080",
  },
};

export const CHAINLINK_STETH_PRICE_FEED =
  "0x86392dC19c0b719886221c78AB11eb8Cf5c52812";

export const TOTAL_UNSTAKED_STETH_TOLERANCE = 10;
// report only unstaked values higher than 10% of the pools size
export const TOTAL_UNSTAKED_STETH_MIN_REPORT_PERCENT = 10;

// all consts in the block bellow are in percents
export const IMBALANCE_TOLERANCE = 10;
export const IMBALANCE_CHANGE_TOLERANCE = 10;
export const POOL_SIZE_CHANGE_TOLERANCE_INFO = 5;
export const POOL_SIZE_CHANGE_TOLERANCE_HIGH = 10;

//! Don't report if time passed since report moment is greater than REPORT_WINDOW
export const POOLS_BALANCES_REPORT_WINDOW = 60 * 60 * 24 * 7; // 1 week

export const PEG_REPORT_INTERVAL = 60 * 60 * 24; // 24 hours
export const PEG_STEP_ALERT_MIN_VALUE = 0.98;
export const PEG_STEP = 0.01;
export const PEG_THRESHOLD = 0.99;
